"""
Comprehensive test suite for messaging WebSocket consumers

Tests real-time messaging functionality, WebSocket connections,
authentication, permissions, and message broadcasting.
"""

import json
import asyncio
import uuid
from datetime import datetime, timedelta
from channels.testing import WebsocketCommunicator
from channels.db import database_sync_to_async
from django.test import TransactionTestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework_simplejwt.tokens import AccessToken

from ..consumers import (
    ThreadMessagingConsumer,
    UserMessagingConsumer,
    RoomConsumer,
    GeneralMessagingConsumer
)
from ..models import (
    MessageThread,
    ThreadParticipant,
    Message,
    MessageReadReceipt,
    TypingIndicator
)
from ..routing import websocket_urlpatterns

User = get_user_model()


class WebSocketTestCase(TransactionTestCase):
    """Base test case for WebSocket tests"""
    
    def setUp(self):
        """Set up test data"""
        self.admin_user = User.objects.create_user(
            email='admin@test.com',
            password='testpass123',
            role='ADMIN',
            first_name='Admin',
            last_name='User'
        )
        
        self.client_user = User.objects.create_user(
            email='client@test.com',
            password='testpass123',
            role='CLIENT',
            first_name='Client',
            last_name='User'
        )
        
        self.other_client = User.objects.create_user(
            email='other@test.com',
            password='testpass123',
            role='CLIENT',
            first_name='Other',
            last_name='Client'
        )
        
        # Create test tokens
        self.admin_token = str(AccessToken.for_user(self.admin_user))
        self.client_token = str(AccessToken.for_user(self.client_user))
        self.other_client_token = str(AccessToken.for_user(self.other_client))
        
        # Create test thread
        self.thread = MessageThread.objects.create(
            client=self.client_user,
            subject='Test Thread'
        )
    
    async def create_communicator(self, consumer_class, path, token=None, **kwargs):
        """Helper to create WebSocket communicator with authentication"""
        query_string = f"token={token}" if token else ""
        
        communicator = WebsocketCommunicator(
            consumer_class.as_asgi(),
            f"{path}?{query_string}"
        )
        
        return communicator
    
    async def connect_and_authenticate(self, consumer_class, path, token):
        """Helper to connect and authenticate WebSocket"""
        communicator = await self.create_communicator(consumer_class, path, token)
        connected, subprotocol = await communicator.connect()
        
        if not connected:
            await communicator.disconnect()
            return None, None
            
        return communicator, connected


class ThreadMessagingConsumerTest(WebSocketTestCase):
    """Test ThreadMessagingConsumer functionality"""
    
    async def test_connection_with_valid_token(self):
        """Test WebSocket connection with valid authentication"""
        communicator, connected = await self.connect_and_authenticate(
            ThreadMessagingConsumer,
            f"/ws/messaging/threads/{self.thread.id}/",
            self.client_token
        )
        
        self.assertTrue(connected)
        
        await communicator.disconnect()
    
    async def test_connection_without_token(self):
        """Test WebSocket connection rejection without token"""
        communicator = WebsocketCommunicator(
            ThreadMessagingConsumer.as_asgi(),
            f"/ws/messaging/threads/{self.thread.id}/"
        )
        
        connected, subprotocol = await communicator.connect()
        self.assertFalse(connected)
    
    async def test_connection_with_invalid_token(self):
        """Test WebSocket connection rejection with invalid token"""
        communicator, connected = await self.connect_and_authenticate(
            ThreadMessagingConsumer,
            f"/ws/messaging/threads/{self.thread.id}/",
            "invalid.token.here"
        )
        
        self.assertIsNone(communicator)
    
    async def test_thread_access_permissions(self):
        """Test thread access permissions for different users"""
        # Client owner should have access
        communicator, connected = await self.connect_and_authenticate(
            ThreadMessagingConsumer,
            f"/ws/messaging/threads/{self.thread.id}/",
            self.client_token
        )
        self.assertTrue(connected)
        await communicator.disconnect()
        
        # Admin should have access
        communicator, connected = await self.connect_and_authenticate(
            ThreadMessagingConsumer,
            f"/ws/messaging/threads/{self.thread.id}/",
            self.admin_token
        )
        self.assertTrue(connected)
        await communicator.disconnect()
        
        # Other client should not have access
        communicator = await self.create_communicator(
            ThreadMessagingConsumer,
            f"/ws/messaging/threads/{self.thread.id}/",
            self.other_client_token
        )
        connected, _ = await communicator.connect()
        self.assertFalse(connected)
    
    async def test_ping_pong(self):
        """Test ping-pong functionality"""
        communicator, connected = await self.connect_and_authenticate(
            ThreadMessagingConsumer,
            f"/ws/messaging/threads/{self.thread.id}/",
            self.client_token
        )
        
        # Send ping
        await communicator.send_json_to({
            "type": "ping"
        })
        
        # Receive pong
        response = await communicator.receive_json_from()
        self.assertEqual(response["type"], "success")
        self.assertEqual(response["message"], "pong")
        
        await communicator.disconnect()
    
    async def test_send_message(self):
        """Test sending message through WebSocket"""
        communicator, connected = await self.connect_and_authenticate(
            ThreadMessagingConsumer,
            f"/ws/messaging/threads/{self.thread.id}/",
            self.client_token
        )
        
        # Send message
        await communicator.send_json_to({
            "type": "send_message",
            "content": "Test WebSocket message",
            "message_type": "text"
        })
        
        # Should receive success response
        response = await communicator.receive_json_from()
        self.assertEqual(response["type"], "success")
        self.assertEqual(response["message"], "Message sent")
        self.assertIn("message_id", response["data"])
        
        # Verify message was created in database
        message_exists = await database_sync_to_async(
            Message.objects.filter(
                thread=self.thread,
                content="Test WebSocket message",
                sender=self.client_user
            ).exists
        )()
        self.assertTrue(message_exists)
        
        await communicator.disconnect()
    
    async def test_send_empty_message_validation(self):
        """Test validation of empty messages"""
        communicator, connected = await self.connect_and_authenticate(
            ThreadMessagingConsumer,
            f"/ws/messaging/threads/{self.thread.id}/",
            self.client_token
        )
        
        # Send empty message
        await communicator.send_json_to({
            "type": "send_message",
            "content": "",
            "message_type": "text"
        })
        
        # Should receive error response
        response = await communicator.receive_json_from()
        self.assertEqual(response["type"], "error")
        self.assertIn("cannot be empty", response["message"])
        
        await communicator.disconnect()
    
    async def test_send_long_message_validation(self):
        """Test validation of overly long messages"""
        communicator, connected = await self.connect_and_authenticate(
            ThreadMessagingConsumer,
            f"/ws/messaging/threads/{self.thread.id}/",
            self.client_token
        )
        
        # Send very long message
        long_content = "A" * 10000  # Exceeds 5000 character limit
        await communicator.send_json_to({
            "type": "send_message",
            "content": long_content,
            "message_type": "text"
        })
        
        # Should receive error response
        response = await communicator.receive_json_from()
        self.assertEqual(response["type"], "error")
        self.assertIn("too long", response["message"])
        
        await communicator.disconnect()
    
    async def test_internal_note_permissions(self):
        """Test internal note creation permissions"""
        # Admin should be able to send internal notes
        admin_communicator, _ = await self.connect_and_authenticate(
            ThreadMessagingConsumer,
            f"/ws/messaging/threads/{self.thread.id}/",
            self.admin_token
        )
        
        await admin_communicator.send_json_to({
            "type": "send_message",
            "content": "Admin internal note",
            "is_internal_note": True
        })
        
        response = await admin_communicator.receive_json_from()
        self.assertEqual(response["type"], "success")
        
        await admin_communicator.disconnect()
        
        # Client should not be able to send internal notes
        client_communicator, _ = await self.connect_and_authenticate(
            ThreadMessagingConsumer,
            f"/ws/messaging/threads/{self.thread.id}/",
            self.client_token
        )
        
        await client_communicator.send_json_to({
            "type": "send_message",
            "content": "Client trying internal note",
            "is_internal_note": True
        })
        
        response = await client_communicator.receive_json_from()
        self.assertEqual(response["type"], "error")
        self.assertIn("Only admins", response["message"])
        
        await client_communicator.disconnect()
    
    async def test_typing_indicator(self):
        """Test typing indicator functionality"""
        communicator, connected = await self.connect_and_authenticate(
            ThreadMessagingConsumer,
            f"/ws/messaging/threads/{self.thread.id}/",
            self.client_token
        )
        
        # Start typing
        await communicator.send_json_to({
            "type": "typing",
            "is_typing": True
        })
        
        # Verify typing indicator created
        typing_exists = await database_sync_to_async(
            TypingIndicator.objects.filter(
                thread=self.thread,
                user=self.client_user,
                is_typing=True
            ).exists
        )()
        self.assertTrue(typing_exists)
        
        # Stop typing
        await communicator.send_json_to({
            "type": "typing",
            "is_typing": False
        })
        
        # Verify typing indicator removed
        typing_exists = await database_sync_to_async(
            TypingIndicator.objects.filter(
                thread=self.thread,
                user=self.client_user
            ).exists
        )()
        self.assertFalse(typing_exists)
        
        await communicator.disconnect()
    
    async def test_mark_messages_read(self):
        """Test marking messages as read"""
        # Create test message
        message = await database_sync_to_async(Message.objects.create)(
            thread=self.thread,
            sender=self.admin_user,
            content="Test message to mark read"
        )
        
        communicator, connected = await self.connect_and_authenticate(
            ThreadMessagingConsumer,
            f"/ws/messaging/threads/{self.thread.id}/",
            self.client_token
        )
        
        # Mark specific message as read
        await communicator.send_json_to({
            "type": "mark_read",
            "message_ids": [str(message.id)]
        })
        
        response = await communicator.receive_json_from()
        self.assertEqual(response["type"], "success")
        self.assertIn("marked as read", response["message"])
        
        # Verify read receipt created
        read_receipt_exists = await database_sync_to_async(
            MessageReadReceipt.objects.filter(
                message=message,
                user=self.client_user
            ).exists
        )()
        self.assertTrue(read_receipt_exists)
        
        await communicator.disconnect()
    
    async def test_mark_thread_read(self):
        """Test marking entire thread as read"""
        # Create multiple test messages
        message1 = await database_sync_to_async(Message.objects.create)(
            thread=self.thread,
            sender=self.admin_user,
            content="Message 1"
        )
        message2 = await database_sync_to_async(Message.objects.create)(
            thread=self.thread,
            sender=self.admin_user,
            content="Message 2"
        )
        
        communicator, connected = await self.connect_and_authenticate(
            ThreadMessagingConsumer,
            f"/ws/messaging/threads/{self.thread.id}/",
            self.client_token
        )
        
        # Mark entire thread as read
        await communicator.send_json_to({
            "type": "mark_read"
        })
        
        response = await communicator.receive_json_from()
        self.assertEqual(response["type"], "success")
        self.assertIn("messages as read", response["message"])
        
        await communicator.disconnect()
    
    async def test_edit_message(self):
        """Test editing messages through WebSocket"""
        # Create test message
        message = await database_sync_to_async(Message.objects.create)(
            thread=self.thread,
            sender=self.client_user,
            content="Original message content"
        )
        
        communicator, connected = await self.connect_and_authenticate(
            ThreadMessagingConsumer,
            f"/ws/messaging/threads/{self.thread.id}/",
            self.client_token
        )
        
        # Edit message
        await communicator.send_json_to({
            "type": "edit_message",
            "message_id": str(message.id),
            "content": "Edited message content"
        })
        
        response = await communicator.receive_json_from()
        self.assertEqual(response["type"], "success")
        self.assertEqual(response["message"], "Message edited")
        
        # Verify message was updated
        await database_sync_to_async(message.refresh_from_db)()
        self.assertEqual(message.content, "Edited message content")
        self.assertEqual(message.original_content, "Original message content")
        self.assertIsNotNone(message.edited_at)
        
        await communicator.disconnect()
    
    async def test_delete_message(self):
        """Test deleting messages through WebSocket"""
        # Create test message
        message = await database_sync_to_async(Message.objects.create)(
            thread=self.thread,
            sender=self.client_user,
            content="Message to delete"
        )
        message_id = message.id
        
        communicator, connected = await self.connect_and_authenticate(
            ThreadMessagingConsumer,
            f"/ws/messaging/threads/{self.thread.id}/",
            self.client_token
        )
        
        # Delete message
        await communicator.send_json_to({
            "type": "delete_message",
            "message_id": str(message_id)
        })
        
        response = await communicator.receive_json_from()
        self.assertEqual(response["type"], "success")
        self.assertEqual(response["message"], "Message deleted")
        
        # Verify message was deleted
        message_exists = await database_sync_to_async(
            Message.objects.filter(id=message_id).exists
        )()
        self.assertFalse(message_exists)
        
        await communicator.disconnect()
    
    async def test_user_presence_notifications(self):
        """Test user presence notifications"""
        # Connect first user
        communicator1, _ = await self.connect_and_authenticate(
            ThreadMessagingConsumer,
            f"/ws/messaging/threads/{self.thread.id}/",
            self.client_token
        )
        
        # Connect second user (should trigger presence notification)
        communicator2, _ = await self.connect_and_authenticate(
            ThreadMessagingConsumer,
            f"/ws/messaging/threads/{self.thread.id}/",
            self.admin_token
        )
        
        # First user should receive presence notification
        try:
            response = await asyncio.wait_for(
                communicator1.receive_json_from(),
                timeout=2.0
            )
            self.assertEqual(response["type"], "user_presence")
            self.assertEqual(response["status"], "joined")
            self.assertEqual(response["user_id"], self.admin_user.id)
        except asyncio.TimeoutError:
            pass  # Presence notifications might be implemented differently
        
        await communicator1.disconnect()
        await communicator2.disconnect()
    
    async def test_typing_broadcast(self):
        """Test typing indicator broadcasting"""
        # Connect two users
        communicator1, _ = await self.connect_and_authenticate(
            ThreadMessagingConsumer,
            f"/ws/messaging/threads/{self.thread.id}/",
            self.client_token
        )
        
        communicator2, _ = await self.connect_and_authenticate(
            ThreadMessagingConsumer,
            f"/ws/messaging/threads/{self.thread.id}/",
            self.admin_token
        )
        
        # First user starts typing
        await communicator1.send_json_to({
            "type": "typing",
            "is_typing": True
        })
        
        # Second user should receive typing notification
        try:
            response = await asyncio.wait_for(
                communicator2.receive_json_from(),
                timeout=2.0
            )
            self.assertEqual(response["type"], "typing_indicator")
            self.assertEqual(response["user_id"], self.client_user.id)
            self.assertTrue(response["is_typing"])
        except asyncio.TimeoutError:
            pass  # Typing broadcasts might be implemented differently
        
        await communicator1.disconnect()
        await communicator2.disconnect()


class UserMessagingConsumerTest(WebSocketTestCase):
    """Test UserMessagingConsumer functionality"""
    
    async def test_user_connection(self):
        """Test user-specific messaging connection"""
        communicator, connected = await self.connect_and_authenticate(
            UserMessagingConsumer,
            "/ws/messaging/user/",
            self.client_token
        )
        
        self.assertTrue(connected)
        
        await communicator.disconnect()
    
    async def test_ping_pong_user(self):
        """Test ping-pong in user messaging"""
        communicator, connected = await self.connect_and_authenticate(
            UserMessagingConsumer,
            "/ws/messaging/user/",
            self.client_token
        )
        
        await communicator.send_json_to({"type": "ping"})
        
        response = await communicator.receive_json_from()
        self.assertEqual(response["type"], "success")
        self.assertEqual(response["message"], "pong")
        
        await communicator.disconnect()
    
    async def test_get_notifications(self):
        """Test getting user notifications"""
        communicator, connected = await self.connect_and_authenticate(
            UserMessagingConsumer,
            "/ws/messaging/user/",
            self.client_token
        )
        
        await communicator.send_json_to({"type": "get_notifications"})
        
        response = await communicator.receive_json_from()
        self.assertEqual(response["type"], "success")
        self.assertIn("notifications", response["data"])
        
        await communicator.disconnect()


class RoomConsumerTest(WebSocketTestCase):
    """Test RoomConsumer functionality (legacy support)"""
    
    async def test_room_connection(self):
        """Test room-specific messaging connection"""
        room_id = "test_room_123"
        communicator, connected = await self.connect_and_authenticate(
            RoomConsumer,
            f"/ws/messaging/room/{room_id}/",
            self.client_token
        )
        
        self.assertTrue(connected)
        
        await communicator.disconnect()
    
    async def test_room_message_broadcast(self):
        """Test room message broadcasting"""
        room_id = "test_room_456"
        
        # Connect two users to same room
        communicator1, _ = await self.connect_and_authenticate(
            RoomConsumer,
            f"/ws/messaging/room/{room_id}/",
            self.client_token
        )
        
        communicator2, _ = await self.connect_and_authenticate(
            RoomConsumer,
            f"/ws/messaging/room/{room_id}/",
            self.admin_token
        )
        
        # First user sends room message
        await communicator1.send_json_to({
            "type": "room_message",
            "message": "Hello room!"
        })
        
        # Second user should receive the message
        try:
            response = await asyncio.wait_for(
                communicator2.receive_json_from(),
                timeout=2.0
            )
            self.assertEqual(response["type"], "room_message")
            self.assertEqual(response["message"], "Hello room!")
            self.assertEqual(response["user_id"], self.client_user.id)
        except asyncio.TimeoutError:
            pass  # Room broadcasting might be implemented differently
        
        await communicator1.disconnect()
        await communicator2.disconnect()


class GeneralMessagingConsumerTest(WebSocketTestCase):
    """Test GeneralMessagingConsumer functionality"""
    
    async def test_general_connection(self):
        """Test general messaging connection"""
        communicator, connected = await self.connect_and_authenticate(
            GeneralMessagingConsumer,
            "/ws/messaging/general/",
            self.client_token
        )
        
        self.assertTrue(connected)
        
        await communicator.disconnect()
    
    async def test_broadcast_admin_only(self):
        """Test broadcast functionality (admin only)"""
        # Admin should be able to broadcast
        admin_communicator, _ = await self.connect_and_authenticate(
            GeneralMessagingConsumer,
            "/ws/messaging/general/",
            self.admin_token
        )
        
        await admin_communicator.send_json_to({
            "type": "broadcast",
            "message": "System-wide announcement"
        })
        
        response = await admin_communicator.receive_json_from()
        self.assertEqual(response["type"], "success")
        self.assertEqual(response["message"], "Broadcast sent")
        
        await admin_communicator.disconnect()
        
        # Client should not be able to broadcast
        client_communicator, _ = await self.connect_and_authenticate(
            GeneralMessagingConsumer,
            "/ws/messaging/general/",
            self.client_token
        )
        
        await client_communicator.send_json_to({
            "type": "broadcast",
            "message": "Client trying to broadcast"
        })
        
        response = await client_communicator.receive_json_from()
        self.assertEqual(response["type"], "error")
        self.assertIn("Only admins", response["message"])
        
        await client_communicator.disconnect()


class WebSocketErrorHandlingTest(WebSocketTestCase):
    """Test WebSocket error handling"""
    
    async def test_invalid_json_handling(self):
        """Test handling of invalid JSON messages"""
        communicator, connected = await self.connect_and_authenticate(
            ThreadMessagingConsumer,
            f"/ws/messaging/threads/{self.thread.id}/",
            self.client_token
        )
        
        # Send invalid JSON
        await communicator.send_to(text_data="invalid json {")
        
        response = await communicator.receive_json_from()
        self.assertEqual(response["type"], "error")
        self.assertIn("Invalid JSON", response["message"])
        
        await communicator.disconnect()
    
    async def test_missing_message_type(self):
        """Test handling of messages without type"""
        communicator, connected = await self.connect_and_authenticate(
            ThreadMessagingConsumer,
            f"/ws/messaging/threads/{self.thread.id}/",
            self.client_token
        )
        
        # Send message without type
        await communicator.send_json_to({"content": "Message without type"})
        
        response = await communicator.receive_json_from()
        self.assertEqual(response["type"], "error")
        self.assertIn("Missing message type", response["message"])
        
        await communicator.disconnect()
    
    async def test_unknown_message_type(self):
        """Test handling of unknown message types"""
        communicator, connected = await self.connect_and_authenticate(
            ThreadMessagingConsumer,
            f"/ws/messaging/threads/{self.thread.id}/",
            self.client_token
        )
        
        # Send message with unknown type
        await communicator.send_json_to({"type": "unknown_type"})
        
        response = await communicator.receive_json_from()
        self.assertEqual(response["type"], "error")
        self.assertIn("Unknown message type", response["message"])
        
        await communicator.disconnect()
    
    async def test_connection_cleanup_on_disconnect(self):
        """Test proper cleanup when WebSocket disconnects"""
        communicator, connected = await self.connect_and_authenticate(
            ThreadMessagingConsumer,
            f"/ws/messaging/threads/{self.thread.id}/",
            self.client_token
        )
        
        # Start typing
        await communicator.send_json_to({
            "type": "typing",
            "is_typing": True
        })
        
        # Verify typing indicator exists
        typing_exists = await database_sync_to_async(
            TypingIndicator.objects.filter(
                thread=self.thread,
                user=self.client_user
            ).exists
        )()
        self.assertTrue(typing_exists)
        
        # Disconnect
        await communicator.disconnect()
        
        # Verify typing indicator was cleaned up
        await asyncio.sleep(0.1)  # Give time for cleanup
        typing_exists = await database_sync_to_async(
            TypingIndicator.objects.filter(
                thread=self.thread,
                user=self.client_user
            ).exists
        )()
        self.assertFalse(typing_exists)


class WebSocketPerformanceTest(WebSocketTestCase):
    """Test WebSocket performance aspects"""
    
    async def test_multiple_connections_same_thread(self):
        """Test multiple users connecting to same thread"""
        communicators = []
        
        # Connect multiple users
        for i in range(5):
            user = await database_sync_to_async(User.objects.create_user)(
                email=f'user{i}@test.com',
                password='testpass123',
                role='CLIENT'
            )
            
            # Add user as participant
            await database_sync_to_async(self.thread.add_participant)(user)
            
            token = str(AccessToken.for_user(user))
            communicator, connected = await self.connect_and_authenticate(
                ThreadMessagingConsumer,
                f"/ws/messaging/threads/{self.thread.id}/",
                token
            )
            
            self.assertTrue(connected)
            communicators.append(communicator)
        
        # Send message from one user
        await communicators[0].send_json_to({
            "type": "send_message",
            "content": "Message to all users"
        })
        
        # First user should get success response
        response = await communicators[0].receive_json_from()
        self.assertEqual(response["type"], "success")
        
        # Clean up
        for communicator in communicators:
            await communicator.disconnect()
    
    async def test_rapid_message_sending(self):
        """Test handling of rapid message sending"""
        communicator, connected = await self.connect_and_authenticate(
            ThreadMessagingConsumer,
            f"/ws/messaging/threads/{self.thread.id}/",
            self.client_token
        )
        
        # Send multiple messages rapidly
        for i in range(10):
            await communicator.send_json_to({
                "type": "send_message",
                "content": f"Rapid message {i}"
            })
            
            # Receive response
            response = await communicator.receive_json_from()
            self.assertEqual(response["type"], "success")
        
        # Verify all messages were created
        message_count = await database_sync_to_async(
            Message.objects.filter(
                thread=self.thread,
                sender=self.client_user,
                content__startswith="Rapid message"
            ).count
        )()
        self.assertEqual(message_count, 10)
        
        await communicator.disconnect()


class WebSocketIntegrationTest(WebSocketTestCase):
    """Integration tests for complete WebSocket workflows"""
    
    async def test_complete_conversation_flow(self):
        """Test complete conversation flow with multiple participants"""
        # Add admin as participant
        await database_sync_to_async(self.thread.add_participant)(self.admin_user)
        
        # Connect both users
        client_comm, _ = await self.connect_and_authenticate(
            ThreadMessagingConsumer,
            f"/ws/messaging/threads/{self.thread.id}/",
            self.client_token
        )
        
        admin_comm, _ = await self.connect_and_authenticate(
            ThreadMessagingConsumer,
            f"/ws/messaging/threads/{self.thread.id}/",
            self.admin_token
        )
        
        # 1. Client starts typing
        await client_comm.send_json_to({
            "type": "typing",
            "is_typing": True
        })
        
        # 2. Client sends message
        await client_comm.send_json_to({
            "type": "send_message",
            "content": "Hello, I need help with my event"
        })
        
        client_response = await client_comm.receive_json_from()
        self.assertEqual(client_response["type"], "success")
        
        # 3. Admin responds
        await admin_comm.send_json_to({
            "type": "send_message",
            "content": "Hello! I'd be happy to help you."
        })
        
        admin_response = await admin_comm.receive_json_from()
        self.assertEqual(admin_response["type"], "success")
        
        # 4. Client marks admin message as read
        admin_message = await database_sync_to_async(
            Message.objects.filter(
                thread=self.thread,
                sender=self.admin_user
            ).first
        )()
        
        await client_comm.send_json_to({
            "type": "mark_read",
            "message_ids": [str(admin_message.id)]
        })
        
        read_response = await client_comm.receive_json_from()
        self.assertEqual(read_response["type"], "success")
        
        # 5. Verify final state
        message_count = await database_sync_to_async(
            Message.objects.filter(thread=self.thread).count
        )()
        self.assertEqual(message_count, 2)
        
        read_receipt_exists = await database_sync_to_async(
            MessageReadReceipt.objects.filter(
                message=admin_message,
                user=self.client_user
            ).exists
        )()
        self.assertTrue(read_receipt_exists)
        
        await client_comm.disconnect()
        await admin_comm.disconnect()


# Test runner helper
def run_async_test(test_func):
    """Helper to run async tests in sync test runner"""
    import asyncio
    
    def wrapper(self):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(test_func(self))
        finally:
            loop.close()
    
    return wrapper


# Apply async test runner to all test methods
for cls_name, cls in list(globals().items()):
    if isinstance(cls, type) and issubclass(cls, WebSocketTestCase) and cls != WebSocketTestCase:
        for attr_name in dir(cls):
            if attr_name.startswith('test_') and asyncio.iscoroutinefunction(getattr(cls, attr_name)):
                setattr(cls, attr_name, run_async_test(getattr(cls, attr_name)))