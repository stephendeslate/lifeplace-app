import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from .models import MessageThread, Message
from .serializers import MessageSerializer

User = get_user_model()


class MessagingConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time messaging functionality.
    Handles message sending, typing indicators, and read receipts.
    """

    async def connect(self):
        """Handle WebSocket connection"""
        # Get thread ID from URL
        self.thread_id = self.scope['url_route']['kwargs']['thread_id']
        self.thread_group_name = f'messaging_thread_{self.thread_id}'

        # Authenticate user from query string token
        query_string = self.scope['query_string'].decode()

        if 'token=' not in query_string:
            await self.close(code=4401)  # Unauthorized
            return

        token = query_string.split('token=')[-1].split('&')[0]

        try:
            # Validate JWT token
            access_token = AccessToken(token)
            user = await self.get_user_from_token(access_token)
            self.user = user

            # Check if user has access to this thread
            has_access = await self.check_thread_access(user, self.thread_id)

            if not has_access:
                await self.close(code=4403)  # Forbidden
                return

            # Join thread group
            await self.channel_layer.group_add(
                self.thread_group_name,
                self.channel_name
            )

            await self.accept()

            # Send connection success message
            await self.send(text_data=json.dumps({
                'type': 'connection_established',
                'thread_id': self.thread_id,
                'user_id': user.id
            }))

        except (InvalidToken, TokenError, ObjectDoesNotExist):
            await self.close(code=4401)  # Unauthorized

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        if hasattr(self, 'thread_group_name'):
            # Leave thread group
            await self.channel_layer.group_discard(
                self.thread_group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')

            if message_type == 'send_message':
                await self.handle_send_message(data)
            elif message_type == 'typing_indicator':
                await self.handle_typing_indicator(data)
            elif message_type == 'mark_as_read':
                await self.handle_mark_as_read(data)
            elif message_type == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))
            else:
                await self.send_error('Unknown message type')

        except json.JSONDecodeError:
            await self.send_error('Invalid JSON format')
        except Exception as e:
            await self.send_error(f'Error processing message: {str(e)}')

    async def handle_send_message(self, data):
        """Handle sending a new message"""
        try:
            content = data.get('content', '').strip()
            is_internal_note = data.get('is_internal_note', False)

            if not content:
                await self.send_error('Message content cannot be empty')
                return

            # Check if user can create internal notes
            if is_internal_note and self.user.role != 'ADMIN':
                await self.send_error('Only admin users can create internal notes')
                return

            # Create message in database
            message = await self.create_message(
                thread_id=self.thread_id,
                sender=self.user,
                content=content,
                is_internal_note=is_internal_note
            )

            # Serialize message
            message_data = await self.serialize_message(message)

            # Send to thread group
            await self.channel_layer.group_send(
                self.thread_group_name,
                {
                    'type': 'new_message',
                    'message': message_data,
                    'sender_id': self.user.id
                }
            )

        except Exception as e:
            await self.send_error(f'Error sending message: {str(e)}')

    async def handle_typing_indicator(self, data):
        """Handle typing indicator updates"""
        is_typing = data.get('is_typing', False)

        # Send typing indicator to other users in the thread
        await self.channel_layer.group_send(
            self.thread_group_name,
            {
                'type': 'typing_indicator',
                'user_id': self.user.id,
                'user_name': self.user.get_display_name(),
                'is_typing': is_typing,
                'sender_channel': self.channel_name  # Don't send back to sender
            }
        )

    async def handle_mark_as_read(self, data):
        """Handle marking messages as read"""
        message_id = data.get('message_id')

        if not message_id:
            await self.send_error('message_id is required')
            return

        try:
            # Mark message as read in database
            await self.mark_message_as_read(message_id, self.user)

            # Send read receipt to thread group
            await self.channel_layer.group_send(
                self.thread_group_name,
                {
                    'type': 'message_read',
                    'message_id': message_id,
                    'user_id': self.user.id,
                    'user_name': self.user.get_display_name()
                }
            )

        except Exception as e:
            await self.send_error(f'Error marking message as read: {str(e)}')

    # Group message handlers
    async def new_message(self, event):
        """Send new message to WebSocket"""
        message_data = event['message']
        sender_id = event['sender_id']

        # Filter internal notes for non-admin users
        if (message_data.get('is_internal_note') and
            self.user.role != 'ADMIN'):
            return  # Don't send internal notes to non-admin users

        await self.send(text_data=json.dumps({
            'type': 'new_message',
            'message': message_data,
            'is_own_message': sender_id == self.user.id
        }))

    async def typing_indicator(self, event):
        """Send typing indicator to WebSocket"""
        # Don't send typing indicator back to the sender
        if event.get('sender_channel') == self.channel_name:
            return

        await self.send(text_data=json.dumps({
            'type': 'typing_indicator',
            'user_id': event['user_id'],
            'user_name': event['user_name'],
            'is_typing': event['is_typing']
        }))

    async def message_read(self, event):
        """Send read receipt to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'message_read',
            'message_id': event['message_id'],
            'user_id': event['user_id'],
            'user_name': event['user_name']
        }))

    async def thread_updated(self, event):
        """Send thread update to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'thread_updated',
            'thread_data': event['thread_data']
        }))

    # Helper methods
    async def send_error(self, message):
        """Send error message to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'error',
            'message': message
        }))

    @database_sync_to_async
    def get_user_from_token(self, access_token):
        """Get user from JWT token"""
        user_id = access_token['user_id']
        return User.objects.get(id=user_id)

    @database_sync_to_async
    def check_thread_access(self, user, thread_id):
        """Check if user has access to the thread"""
        try:
            thread = MessageThread.objects.get(id=thread_id)

            # Admins can access any thread
            if user.role == 'ADMIN':
                return True

            # Clients can only access their own threads
            if user.role == 'CLIENT':
                return thread.client == user

            return False
        except MessageThread.DoesNotExist:
            return False

    @database_sync_to_async
    def create_message(self, thread_id, sender, content, is_internal_note=False):
        """Create a new message in the database"""
        thread = MessageThread.objects.get(id=thread_id)

        message = Message.objects.create(
            thread=thread,
            sender=sender,
            content=content,
            message_type='text',
            is_internal_note=is_internal_note
        )

        # Auto-mark as read for sender
        message.mark_as_read(sender)

        return message

    @database_sync_to_async
    def serialize_message(self, message):
        """Serialize message for WebSocket transmission"""
        from .serializers import MessageSerializer
        serializer = MessageSerializer(message)
        return serializer.data

    @database_sync_to_async
    def mark_message_as_read(self, message_id, user):
        """Mark a message as read by a user"""
        try:
            message = Message.objects.get(id=message_id)

            # Check if user has access to this message
            thread = message.thread

            if user.role == 'CLIENT' and thread.client != user:
                raise PermissionError("User doesn't have access to this message")

            if message.is_internal_note and user.role != 'ADMIN':
                raise PermissionError("User doesn't have access to internal notes")

            message.mark_as_read(user)
            return True

        except Message.DoesNotExist:
            raise ValueError("Message not found")


class GlobalMessagingConsumer(AsyncWebsocketConsumer):
    """
    Global messaging consumer for thread-level updates and notifications.
    Used for inbox updates, notification counts, etc.
    """

    async def connect(self):
        """Handle WebSocket connection for global messaging updates"""
        # Authenticate user
        token = self.scope['query_string'].decode().split('token=')[-1].split('&')[0]

        try:
            access_token = AccessToken(token)
            user = await self.get_user_from_token(access_token)
            self.user = user

            # Join user-specific group for global updates
            self.user_group_name = f'messaging_user_{user.id}'

            await self.channel_layer.group_add(
                self.user_group_name,
                self.channel_name
            )

            await self.accept()

            # Send connection success
            await self.send(text_data=json.dumps({
                'type': 'global_connection_established',
                'user_id': user.id
            }))

        except (InvalidToken, TokenError, ObjectDoesNotExist):
            await self.close(code=4401)

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        if hasattr(self, 'user_group_name'):
            await self.channel_layer.group_discard(
                self.user_group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        """Handle incoming global WebSocket messages"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')

            if message_type == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))
            else:
                await self.send_error('Unknown message type')

        except json.JSONDecodeError:
            await self.send_error('Invalid JSON format')

    # Group message handlers
    async def thread_notification(self, event):
        """Send thread notification to user"""
        await self.send(text_data=json.dumps({
            'type': 'thread_notification',
            'thread_id': event['thread_id'],
            'notification_type': event['notification_type'],
            'data': event.get('data', {})
        }))

    async def unread_count_update(self, event):
        """Send unread count update to user"""
        await self.send(text_data=json.dumps({
            'type': 'unread_count_update',
            'unread_count': event['unread_count']
        }))

    async def send_error(self, message):
        """Send error message to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'error',
            'message': message
        }))

    @database_sync_to_async
    def get_user_from_token(self, access_token):
        """Get user from JWT token"""
        user_id = access_token['user_id']
        return User.objects.get(id=user_id)