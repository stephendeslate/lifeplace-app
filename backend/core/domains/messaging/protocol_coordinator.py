"""
Protocol Coordinator for Messaging Domain.

This module provides a unified interface for message operations that can be
called from both HTTP views and WebSocket consumers, eliminating code duplication
and ensuring consistent behavior across protocols.
"""

import logging
from typing import Dict, Any, Optional
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError, PermissionDenied
from django.db import transaction
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import MessageThread, Message, ThreadParticipant
from .serializers import MessageSerializer, MessageThreadDetailSerializer

logger = logging.getLogger(__name__)
User = get_user_model()


class MessageCoordinator:
    """
    Coordinates message operations across HTTP and WebSocket protocols.
    
    This class provides atomic operations that can be safely called from
    either HTTP views or WebSocket consumers, ensuring consistency and
    proper broadcasting.
    """

    def __init__(self):
        self.channel_layer = get_channel_layer()

    def create_message(self, user: User, thread_id: str, content: str, 
                      message_type: str = 'text', **kwargs) -> Dict[str, Any]:
        """
        Create a new message atomically.
        
        Args:
            user: The user creating the message
            thread_id: The thread ID to send the message to
            content: The message content
            message_type: The type of message (default: 'text')
            **kwargs: Additional message attributes
            
        Returns:
            Dict containing the created message data and metadata
            
        Raises:
            ValidationError: If message data is invalid
            PermissionDenied: If user lacks permission to send message
        """
        try:
            with transaction.atomic():
                # Get or validate thread
                try:
                    thread = MessageThread.objects.get(id=thread_id)
                except MessageThread.DoesNotExist:
                    raise ValidationError(f"Thread {thread_id} does not exist")

                # Basic permission check - user must be a participant
                if not ThreadParticipant.objects.filter(thread=thread, user=user).exists():
                    raise PermissionDenied("User cannot send messages to this thread")

                # Create the message
                message = Message.objects.create(
                    thread=thread,
                    sender=user,
                    content=content,
                    message_type=message_type,
                    **kwargs
                )

                # Update thread last activity
                thread.save()  # This will update updated_at timestamp

                # Serialize message for response
                serializer = MessageSerializer(message)
                message_data = serializer.data

                # Broadcast to WebSocket clients
                self._broadcast_new_message(thread_id, message_data)

                logger.info(f"Message {message.id} created by user {user.id} in thread {thread_id}")

                return {
                    'message': message_data,
                    'thread_id': thread_id,
                    'status': 'created'
                }

        except Exception as e:
            logger.error(f"Error creating message: {str(e)}")
            raise

    def edit_message(self, user: User, message_id: str, content: str) -> Dict[str, Any]:
        """
        Edit an existing message atomically.
        
        Args:
            user: The user editing the message
            message_id: The ID of the message to edit
            content: The new message content
            
        Returns:
            Dict containing the edited message data and metadata
            
        Raises:
            ValidationError: If message data is invalid
            PermissionDenied: If user lacks permission to edit message
        """
        try:
            with transaction.atomic():
                # Get the message
                try:
                    message = Message.objects.get(id=message_id)
                except Message.DoesNotExist:
                    raise ValidationError(f"Message {message_id} does not exist")

                # Basic permission check - user must be the sender
                if message.sender != user:
                    raise PermissionDenied("User cannot edit this message")

                # Update the message
                message.content = content
                message.is_edited = True
                message.save()

                # Serialize message for response
                serializer = MessageSerializer(message)
                message_data = serializer.data

                # Broadcast to WebSocket clients
                self._broadcast_message_update(message.thread_id, message_data, 'edited')

                logger.info(f"Message {message_id} edited by user {user.id}")

                return {
                    'message': message_data,
                    'thread_id': str(message.thread_id),
                    'status': 'edited'
                }

        except Exception as e:
            logger.error(f"Error editing message {message_id}: {str(e)}")
            raise

    def delete_message(self, user: User, message_id: str) -> Dict[str, Any]:
        """
        Delete a message atomically.
        
        Args:
            user: The user deleting the message
            message_id: The ID of the message to delete
            
        Returns:
            Dict containing deletion confirmation and metadata
            
        Raises:
            ValidationError: If message doesn't exist
            PermissionDenied: If user lacks permission to delete message
        """
        try:
            with transaction.atomic():
                # Get the message
                try:
                    message = Message.objects.get(id=message_id)
                except Message.DoesNotExist:
                    raise ValidationError(f"Message {message_id} does not exist")

                # Basic permission check - user must be the sender
                if message.sender != user:
                    raise PermissionDenied("User cannot delete this message")

                thread_id = str(message.thread_id)
                
                # Mark as deleted (soft delete)
                message.is_deleted = True
                message.save()

                # Broadcast to WebSocket clients
                self._broadcast_message_update(thread_id, {'id': message_id}, 'deleted')

                logger.info(f"Message {message_id} deleted by user {user.id}")

                return {
                    'message_id': message_id,
                    'thread_id': thread_id,
                    'status': 'deleted'
                }

        except Exception as e:
            logger.error(f"Error deleting message {message_id}: {str(e)}")
            raise

    def _broadcast_new_message(self, thread_id: str, message_data: Dict[str, Any]):
        """
        Broadcast new message to WebSocket clients.
        
        Args:
            thread_id: The thread ID to broadcast to
            message_data: The message data to broadcast
        """
        if self.channel_layer:
            group_name = f"thread_{thread_id}"
            async_to_sync(self.channel_layer.group_send)(
                group_name,
                {
                    'type': 'new_message',
                    'message': message_data
                }
            )

    def _broadcast_message_update(self, thread_id: str, message_data: Dict[str, Any], 
                                 update_type: str):
        """
        Broadcast message update to WebSocket clients.
        
        Args:
            thread_id: The thread ID to broadcast to
            message_data: The message data to broadcast
            update_type: The type of update ('edited', 'deleted', etc.)
        """
        if self.channel_layer:
            group_name = f"thread_{thread_id}"
            async_to_sync(self.channel_layer.group_send)(
                group_name,
                {
                    'type': 'message_update',
                    'message': message_data,
                    'update_type': update_type
                }
            )

    def get_or_create_thread(self, user: User, participants: list, 
                           title: Optional[str] = None) -> Dict[str, Any]:
        """
        Get or create a message thread with specified participants.
        
        Args:
            user: The user creating/accessing the thread
            participants: List of user IDs to include in the thread
            title: Optional thread title
            
        Returns:
            Dict containing thread data
        """
        try:
            with transaction.atomic():
                # Create new thread
                thread = MessageThread.objects.create(
                    title=title,
                    created_by=user
                )

                # Add participants
                thread_participants = []
                for participant_id in participants:
                    try:
                        participant_user = User.objects.get(id=participant_id)
                        thread_participant = ThreadParticipant.objects.create(
                            thread=thread,
                            user=participant_user
                        )
                        thread_participants.append(thread_participant)
                    except User.DoesNotExist:
                        logger.warning(f"User {participant_id} not found, skipping")

                # Serialize thread for response
                serializer = MessageThreadDetailSerializer(thread)
                thread_data = serializer.data

                logger.info(f"Thread {thread.id} created by user {user.id}")

                return {
                    'thread': thread_data,
                    'status': 'created'
                }

        except Exception as e:
            logger.error(f"Error creating thread: {str(e)}")
            raise


# Singleton instance for use across the application
message_coordinator = MessageCoordinator()