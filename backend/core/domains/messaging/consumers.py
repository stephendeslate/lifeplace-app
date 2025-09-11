"""
WebSocket consumers for the messaging domain.

This module contains WebSocket consumer classes that handle real-time messaging
functionality using Django Channels. Each consumer manages a different type of
messaging connection with comprehensive real-time features.
"""

import json
import logging
import uuid
from typing import Dict, Any, Optional
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.core.exceptions import ValidationError
from django.utils import timezone
from asgiref.sync import sync_to_async

logger = logging.getLogger(__name__)


class BaseMessagingConsumer(AsyncWebsocketConsumer):
    """
    Base WebSocket consumer for messaging functionality.
    
    Provides common functionality like authentication validation,
    error handling, and message formatting.
    """
    
    async def connect(self):
        """Accept WebSocket connection if user is authenticated."""
        self.user = self.scope["user"]
        
        # Only allow authenticated users
        if isinstance(self.user, AnonymousUser):
            await self.close(code=4001)  # Unauthorized
            return
            
        await self.accept()
        logger.info(f"WebSocket connected for user {self.user.id}")
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        logger.info(f"WebSocket disconnected for user {getattr(self.user, 'id', 'unknown')} with code {close_code}")
    
    async def receive(self, text_data):
        """
        Handle received WebSocket message.
        
        Args:
            text_data: JSON string containing message data
        """
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if not message_type:
                await self.send_error("Missing message type")
                return
                
            # Route message based on type
            handler_name = f"handle_{message_type}"
            handler = getattr(self, handler_name, None)
            
            if handler:
                await handler(data)
            else:
                await self.send_error(f"Unknown message type: {message_type}")
                
        except json.JSONDecodeError:
            await self.send_error("Invalid JSON format")
        except Exception as e:
            logger.error(f"Error handling WebSocket message: {e}")
            await self.send_error("Internal server error")
    
    async def send_error(self, message):
        """Send error message to client."""
        await self.send(text_data=json.dumps({
            'type': 'error',
            'message': message
        }))
    
    async def send_success(self, message, data=None):
        """Send success message to client."""
        response = {
            'type': 'success',
            'message': message
        }
        if data:
            response['data'] = data
            
        await self.send(text_data=json.dumps(response))


class ThreadMessagingConsumer(BaseMessagingConsumer):
    """
    Thread-specific messaging WebSocket consumer.
    
    Handles real-time messaging for specific message threads with
    comprehensive features like typing indicators, read receipts,
    and message broadcasting.
    """
    
    async def connect(self):
        """Connect to thread-specific messaging channel."""
        self.thread_id = self.scope['url_route']['kwargs']['thread_id']
        self.user_group_name = f'user_{self.scope["user"].id}'
        self.thread_group_name = f'thread_{self.thread_id}'
        
        await super().connect()
        
        if hasattr(self, 'user') and not isinstance(self.user, AnonymousUser):
            # Verify user has access to this thread
            has_access = await self.check_thread_access()
            if not has_access:
                await self.close(code=4003)  # Forbidden
                return
            
            # Join user's personal group
            await self.channel_layer.group_add(
                self.user_group_name,
                self.channel_name
            )
            
            # Join thread group
            await self.channel_layer.group_add(
                self.thread_group_name,
                self.channel_name
            )
            
            # Notify others of user presence
            await self.channel_layer.group_send(
                self.thread_group_name,
                {
                    'type': 'user_presence',
                    'user_id': self.user.id,
                    'user_name': self.user.get_display_name(),
                    'status': 'joined',
                    'timestamp': timezone.now().isoformat()
                }
            )
            
            logger.info(f"User {self.user.id} connected to thread {self.thread_id}")
    
    async def disconnect(self, close_code):
        """Disconnect from thread messaging channel."""
        if hasattr(self, 'user') and not isinstance(self.user, AnonymousUser):
            # Clear typing indicators
            await self.clear_typing_indicator()
            
            # Notify others of user leaving
            if hasattr(self, 'thread_group_name'):
                await self.channel_layer.group_send(
                    self.thread_group_name,
                    {
                        'type': 'user_presence',
                        'user_id': self.user.id,
                        'user_name': self.user.get_display_name(),
                        'status': 'left',
                        'timestamp': timezone.now().isoformat()
                    }
                )
        
        # Leave groups
        if hasattr(self, 'user_group_name'):
            await self.channel_layer.group_discard(
                self.user_group_name,
                self.channel_name
            )
        if hasattr(self, 'thread_group_name'):
            await self.channel_layer.group_discard(
                self.thread_group_name,
                self.channel_name
            )
        
        await super().disconnect(close_code)
        logger.info(f"User {getattr(self.user, 'id', 'unknown')} disconnected from thread {self.thread_id}")
    
    async def handle_ping(self, data):
        """Handle ping message for connection testing."""
        await self.send_success("pong")
    
    async def handle_send_message(self, data):
        """Handle sending a new message."""
        content = data.get('content', '').strip()
        message_type = data.get('message_type', 'text')
        is_internal_note = data.get('is_internal_note', False)
        parent_message_id = data.get('parent_message_id')
        
        if not content:
            await self.send_error("Message content cannot be empty")
            return
        
        if len(content) > 5000:
            await self.send_error("Message content too long (max 5000 characters)")
            return
        
        # Validate internal note permission
        if is_internal_note and self.user.role != 'ADMIN':
            await self.send_error("Only admins can send internal notes")
            return
        
        try:
            # Send message via service
            message = await self.create_message(
                content=content,
                message_type=message_type,
                is_internal_note=is_internal_note,
                parent_message_id=parent_message_id
            )
            
            if message:
                await self.send_success("Message sent", {
                    'message_id': str(message.id)
                })
            else:
                await self.send_error("Failed to send message")
                
        except Exception as e:
            logger.error(f"Error sending message: {e}")
            await self.send_error("Failed to send message")
    
    async def handle_mark_read(self, data):
        """Handle marking messages as read."""
        message_ids = data.get('message_ids', [])
        
        if not message_ids:
            # Mark entire thread as read
            count = await self.mark_thread_read()
            await self.send_success(f"Marked {count} messages as read")
        else:
            # Mark specific messages as read
            count = await self.mark_messages_read(message_ids)
            await self.send_success(f"Marked {count} messages as read")
    
    async def handle_typing(self, data):
        """Handle typing indicator."""
        is_typing = data.get('is_typing', True)
        
        try:
            await self.update_typing_indicator(is_typing)
            
            # Broadcast typing status to other users in thread
            await self.channel_layer.group_send(
                self.thread_group_name,
                {
                    'type': 'typing_indicator',
                    'user_id': self.user.id,
                    'user_name': self.user.get_display_name(),
                    'is_typing': is_typing,
                    'timestamp': timezone.now().isoformat()
                }
            )
            
        except Exception as e:
            logger.error(f"Error updating typing indicator: {e}")
    
    async def handle_edit_message(self, data):
        """Handle editing a message."""
        message_id = data.get('message_id')
        new_content = data.get('content', '').strip()
        
        if not message_id or not new_content:
            await self.send_error("Message ID and content are required")
            return
        
        try:
            success = await self.edit_message(message_id, new_content)
            if success:
                await self.send_success("Message edited")
            else:
                await self.send_error("Failed to edit message")
        except Exception as e:
            logger.error(f"Error editing message: {e}")
            await self.send_error(str(e))
    
    async def handle_delete_message(self, data):
        """Handle deleting a message."""
        message_id = data.get('message_id')
        
        if not message_id:
            await self.send_error("Message ID is required")
            return
        
        try:
            success = await self.delete_message(message_id)
            if success:
                await self.send_success("Message deleted")
            else:
                await self.send_error("Failed to delete message")
        except Exception as e:
            logger.error(f"Error deleting message: {e}")
            await self.send_error(str(e))
    
    # WebSocket event handlers
    
    async def messaging_update(self, event):
        """Handle messaging updates from services."""
        await self.send(text_data=json.dumps(event['data']))
    
    async def user_presence(self, event):
        """Handle user presence updates."""
        # Don't send presence updates to the user themselves
        if event['user_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'user_presence',
                'user_id': event['user_id'],
                'user_name': event['user_name'],
                'status': event['status'],
                'timestamp': event['timestamp']
            }))
    
    async def typing_indicator(self, event):
        """Handle typing indicator updates."""
        # Don't send typing updates to the user themselves
        if event['user_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'typing_indicator',
                'user_id': event['user_id'],
                'user_name': event['user_name'],
                'is_typing': event['is_typing'],
                'timestamp': event['timestamp']
            }))
    
    # Database operations
    
    @database_sync_to_async
    def check_thread_access(self) -> bool:
        """Check if user has access to the thread."""
        try:
            from .models import MessageThread
            thread = MessageThread.objects.get(id=self.thread_id)
            
            if self.user.role == 'CLIENT':
                return thread.client == self.user
            elif self.user.role == 'ADMIN':
                return True
            
            return False
        except Exception:
            return False
    
    @database_sync_to_async
    def create_message(self, content: str, message_type: str = 'text', 
                      is_internal_note: bool = False, parent_message_id: Optional[str] = None):
        """Create a new message in the thread."""
        try:
            from .models import MessageThread, Message
            from .services import MessagingService
            
            thread = MessageThread.objects.get(id=self.thread_id)
            
            parent_message = None
            if parent_message_id:
                try:
                    parent_message = Message.objects.get(id=parent_message_id, thread=thread)
                except Message.DoesNotExist:
                    pass
            
            message = MessagingService.send_message(
                thread=thread,
                sender=self.user,
                content=content,
                message_type=message_type,
                is_internal_note=is_internal_note,
                parent_message=parent_message
            )
            
            return message
        except Exception as e:
            logger.error(f"Error creating message: {e}")
            return None
    
    @database_sync_to_async
    def mark_thread_read(self) -> int:
        """Mark all messages in thread as read."""
        try:
            from .models import MessageThread
            from .services import MessagingService
            
            thread = MessageThread.objects.get(id=self.thread_id)
            return MessagingService.mark_thread_read(thread, self.user)
        except Exception as e:
            logger.error(f"Error marking thread as read: {e}")
            return 0
    
    @database_sync_to_async
    def mark_messages_read(self, message_ids: list) -> int:
        """Mark specific messages as read."""
        try:
            from .models import Message
            
            messages = Message.objects.filter(
                id__in=message_ids,
                thread_id=self.thread_id
            )
            
            # Filter internal notes for clients
            if self.user.role == 'CLIENT':
                messages = messages.filter(is_internal_note=False)
            
            count = 0
            for message in messages:
                if not message.is_read_by(self.user):
                    message.mark_as_read_by(self.user)
                    count += 1
            
            return count
        except Exception as e:
            logger.error(f"Error marking messages as read: {e}")
            return 0
    
    @database_sync_to_async
    def update_typing_indicator(self, is_typing: bool):
        """Update typing indicator for user in thread."""
        try:
            from .models import TypingIndicator, MessageThread
            
            thread = MessageThread.objects.get(id=self.thread_id)
            
            if is_typing:
                indicator, created = TypingIndicator.objects.update_or_create(
                    thread=thread,
                    user=self.user,
                    defaults={
                        'is_typing': True,
                        'last_activity': timezone.now()
                    }
                )
            else:
                TypingIndicator.objects.filter(
                    thread=thread,
                    user=self.user
                ).delete()
                
        except Exception as e:
            logger.error(f"Error updating typing indicator: {e}")
    
    @database_sync_to_async
    def clear_typing_indicator(self):
        """Clear typing indicator for user in thread."""
        try:
            from .models import TypingIndicator
            
            TypingIndicator.objects.filter(
                thread_id=self.thread_id,
                user=self.user
            ).delete()
        except Exception as e:
            logger.error(f"Error clearing typing indicator: {e}")
    
    @database_sync_to_async
    def edit_message(self, message_id: str, new_content: str) -> bool:
        """Edit a message."""
        try:
            from .models import Message
            from .services import MessagingService
            
            message = Message.objects.get(
                id=message_id,
                thread_id=self.thread_id,
                sender=self.user
            )
            
            # Check time limit (15 minutes)
            time_limit = timezone.now() - timezone.timedelta(minutes=15)
            if message.created_at < time_limit:
                raise ValidationError("Message can only be edited within 15 minutes")
            
            # Store original content if first edit
            if not message.original_content:
                message.original_content = message.content
            
            message.content = new_content.strip()
            message.edited_at = timezone.now()
            message.save()
            
            # Broadcast edit
            MessagingService.broadcast_message_edited(message)
            
            return True
        except Exception as e:
            logger.error(f"Error editing message: {e}")
            raise e
    
    @database_sync_to_async
    def delete_message(self, message_id: str) -> bool:
        """Delete a message."""
        try:
            from .models import Message
            from .services import MessagingService
            
            message = Message.objects.get(
                id=message_id,
                thread_id=self.thread_id
            )
            
            # Check permissions
            if self.user.role == 'ADMIN':
                # Admins can delete any message
                pass
            elif message.sender == self.user:
                # Users can delete their own messages within 1 hour
                time_limit = timezone.now() - timezone.timedelta(hours=1)
                if message.created_at < time_limit:
                    raise ValidationError("Message can only be deleted within 1 hour")
            else:
                raise ValidationError("Permission denied")
            
            # Broadcast deletion before deleting
            MessagingService.broadcast_message_deleted(message)
            
            message.delete()
            return True
        except Exception as e:
            logger.error(f"Error deleting message: {e}")
            raise e


# Legacy RoomConsumer - kept for backwards compatibility
class RoomConsumer(BaseMessagingConsumer):
    """
    Room-specific messaging WebSocket consumer.
    
    Handles messaging within specific rooms or channels.
    """
    
    async def connect(self):
        """Connect to room-specific messaging channel."""
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'messaging_room_{self.room_id}'
        
        await super().connect()
        
        if hasattr(self, 'user') and not isinstance(self.user, AnonymousUser):
            # Join room group
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            
            # Notify room of user joining
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_joined',
                    'user_id': self.user.id,
                    'username': self.user.username,
                }
            )
    
    async def disconnect(self, close_code):
        """Disconnect from room messaging channel."""
        if hasattr(self, 'room_group_name'):
            # Notify room of user leaving
            if hasattr(self, 'user') and not isinstance(self.user, AnonymousUser):
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'user_left',
                        'user_id': self.user.id,
                        'username': self.user.username,
                    }
                )
            
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
        await super().disconnect(close_code)
    
    async def handle_room_message(self, data):
        """Handle room message."""
        message_content = data.get('message', '')
        
        if not message_content.strip():
            await self.send_error("Message content cannot be empty")
            return
        
        # Send message to room group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'room_message',
                'room_id': self.room_id,
                'user_id': self.user.id,
                'username': self.user.username,
                'message': message_content,
            }
        )
    
    async def room_message(self, event):
        """Send room message to WebSocket client."""
        await self.send(text_data=json.dumps({
            'type': 'room_message',
            'room_id': event['room_id'],
            'user_id': event['user_id'],
            'username': event['username'],
            'message': event['message'],
        }))
    
    async def user_joined(self, event):
        """Send user joined notification to WebSocket client."""
        await self.send(text_data=json.dumps({
            'type': 'user_joined',
            'user_id': event['user_id'],
            'username': event['username'],
        }))
    
    async def user_left(self, event):
        """Send user left notification to WebSocket client."""
        await self.send(text_data=json.dumps({
            'type': 'user_left',
            'user_id': event['user_id'],
            'username': event['username'],
        }))


class UserMessagingConsumer(BaseMessagingConsumer):
    """
    User-specific messaging WebSocket consumer.
    
    Handles user-specific messaging notifications and updates.
    This consumer connects users to their personal notification channel.
    """
    
    async def connect(self):
        """Connect to user-specific messaging channel."""
        await super().connect()
        
        if hasattr(self, 'user') and not isinstance(self.user, AnonymousUser):
            # Join user-specific group for notifications
            self.user_group_name = f'user_{self.user.id}'
            await self.channel_layer.group_add(
                self.user_group_name,
                self.channel_name
            )
            
            logger.info(f"User {self.user.id} connected to personal messaging channel")
    
    async def disconnect(self, close_code):
        """Disconnect from user messaging channel."""
        if hasattr(self, 'user_group_name'):
            await self.channel_layer.group_discard(
                self.user_group_name,
                self.channel_name
            )
        await super().disconnect(close_code)
        logger.info(f"User {getattr(self.user, 'id', 'unknown')} disconnected from personal messaging channel")
    
    async def handle_ping(self, data):
        """Handle ping message for connection testing."""
        await self.send_success("pong")
    
    async def handle_get_notifications(self, data):
        """Handle request for pending notifications."""
        try:
            notifications = await self.get_pending_notifications()
            await self.send_success("Notifications retrieved", {
                'notifications': notifications
            })
        except Exception as e:
            logger.error(f"Error getting notifications: {e}")
            await self.send_error("Failed to get notifications")
    
    async def handle_mark_notification_read(self, data):
        """Handle marking notification as read."""
        notification_id = data.get('notification_id')
        if not notification_id:
            await self.send_error("Notification ID is required")
            return
        
        try:
            success = await self.mark_notification_read(notification_id)
            if success:
                await self.send_success("Notification marked as read")
            else:
                await self.send_error("Failed to mark notification as read")
        except Exception as e:
            logger.error(f"Error marking notification as read: {e}")
            await self.send_error("Failed to mark notification as read")
    
    # WebSocket event handlers
    
    async def messaging_update(self, event):
        """Handle messaging updates (new messages, etc.)."""
        await self.send(text_data=json.dumps(event['data']))
    
    async def notification_update(self, event):
        """Handle notification updates."""
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'data': event['data']
        }))
    
    # Database operations
    
    @database_sync_to_async
    def get_pending_notifications(self) -> list:
        """Get pending notifications for user."""
        try:
            # This would integrate with the notifications domain
            # For now, return empty list
            return []
        except Exception as e:
            logger.error(f"Error getting pending notifications: {e}")
            return []
    
    @database_sync_to_async
    def mark_notification_read(self, notification_id: str) -> bool:
        """Mark notification as read."""
        try:
            # This would integrate with the notifications domain
            # For now, return True
            return True
        except Exception as e:
            logger.error(f"Error marking notification as read: {e}")
            return False


class GeneralMessagingConsumer(BaseMessagingConsumer):
    """
    General messaging WebSocket consumer for system-wide messaging.
    
    Handles general messaging functionality that doesn't belong
    to specific threads or users.
    """
    
    async def connect(self):
        """Connect to general messaging channel."""
        await super().connect()
        
        if hasattr(self, 'user') and not isinstance(self.user, AnonymousUser):
            # Join general messaging group
            self.group_name = "messaging_general"
            await self.channel_layer.group_add(
                self.group_name,
                self.channel_name
            )
            
            logger.info(f"User {self.user.id} connected to general messaging")
    
    async def disconnect(self, close_code):
        """Disconnect from general messaging channel."""
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )
        await super().disconnect(close_code)
        logger.info(f"User {getattr(self.user, 'id', 'unknown')} disconnected from general messaging")
    
    async def handle_ping(self, data):
        """Handle ping message for connection testing."""
        await self.send_success("pong")
    
    async def handle_broadcast(self, data):
        """Handle broadcast message (admin only)."""
        if self.user.role != 'ADMIN':
            await self.send_error("Only admins can send broadcast messages")
            return
        
        message_content = data.get('message', '')
        
        if not message_content.strip():
            await self.send_error("Message content cannot be empty")
            return
        
        # Broadcast message to all connected users
        await self.channel_layer.group_send(
            self.group_name,
            {
                'type': 'broadcast_message',
                'user_id': self.user.id,
                'user_name': self.user.get_display_name(),
                'message': message_content,
                'timestamp': timezone.now().isoformat()
            }
        )
        
        await self.send_success("Broadcast sent")
    
    async def broadcast_message(self, event):
        """Send broadcast message to WebSocket client."""
        # Don't send broadcast to the sender
        if event['user_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'broadcast',
                'user_id': event['user_id'],
                'user_name': event['user_name'],
                'message': event['message'],
                'timestamp': event['timestamp']
            }))