"""
Business logic services for the messaging domain.

This module provides service classes for handling messaging operations,
WebSocket broadcasting, and notification functionality.
"""

import json
import logging
from typing import List, Optional, Dict, Any
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.db import transaction
from django.utils import timezone
from django.contrib.auth import get_user_model

from .models import (
    MessageThread,
    ThreadParticipant,
    Message,
    MessageAttachment,
    TypingIndicator
)

User = get_user_model()
logger = logging.getLogger(__name__)


class MessagingService:
    """
    Service class for core messaging operations and WebSocket broadcasting
    """
    
    @staticmethod
    def create_thread(
        client: User,
        event=None,
        subject: str = "",
        priority: str = "normal",
        created_by: Optional[User] = None
    ) -> MessageThread:
        """
        Create a new message thread with proper initialization
        
        Args:
            client: The client user for the thread
            event: Optional event to associate with thread
            subject: Optional subject line
            priority: Thread priority level
            created_by: User creating the thread
            
        Returns:
            Created MessageThread instance
        """
        with transaction.atomic():
            thread = MessageThread.objects.create(
                client=client,
                event=event,
                subject=subject,
                priority=priority
            )
            
            # Add client as participant
            thread.add_participant(client)
            
            # Add creator as participant if different from client
            if created_by and created_by != client:
                thread.add_participant(created_by)
            
            logger.info(f"Thread created: {thread.id} for client {client.id}")
            return thread
    
    @staticmethod
    def send_message(
        thread: MessageThread,
        sender: User,
        content: str,
        message_type: str = "text",
        is_internal_note: bool = False,
        parent_message: Optional[Message] = None,
        attachments: Optional[List] = None
    ) -> Message:
        """
        Send a message in a thread with proper validation and broadcasting
        
        Args:
            thread: Thread to send message in
            sender: User sending the message
            content: Message content
            message_type: Type of message
            is_internal_note: Whether this is an internal admin note
            parent_message: Parent message for replies
            attachments: List of attachment files
            
        Returns:
            Created Message instance
        """
        with transaction.atomic():
            # Create message
            message = Message.objects.create(
                thread=thread,
                sender=sender,
                content=content.strip(),
                message_type=message_type,
                is_internal_note=is_internal_note,
                parent_message=parent_message
            )
            
            # Create attachments if provided
            if attachments:
                for attachment_file in attachments:
                    MessageAttachment.objects.create(
                        message=message,
                        file=attachment_file,
                        filename=attachment_file.name,
                        uploaded_by=sender
                    )
            
            # Mark as read by sender
            message.mark_as_read_by(sender)
            
            # Clear sender's typing indicator
            TypingIndicator.objects.filter(thread=thread, user=sender).delete()
            
            # Ensure sender is a participant
            thread.add_participant(sender)
            
            # Update thread status if was resolved
            if thread.status == 'resolved':
                thread.status = 'active'
                thread.save()
            
            logger.info(f"Message sent: {message.id} in thread {thread.id}")
            return message
    
    @staticmethod
    def get_thread_messages(
        thread: MessageThread,
        user: User,
        limit: Optional[int] = None,
        offset: Optional[int] = None
    ) -> List[Message]:
        """
        Get messages for a thread with proper filtering for user role
        
        Args:
            thread: Thread to get messages from
            user: User requesting messages
            limit: Optional limit on number of messages
            offset: Optional offset for pagination
            
        Returns:
            List of Message instances
        """
        queryset = thread.messages.select_related('sender').prefetch_related('attachments')
        
        # Filter internal notes for clients
        if user.role == 'CLIENT':
            queryset = queryset.filter(is_internal_note=False)
        
        # Apply pagination
        queryset = queryset.order_by('created_at')
        if offset:
            queryset = queryset[offset:]
        if limit:
            queryset = queryset[:limit]
        
        return list(queryset)
    
    @staticmethod
    def mark_thread_read(thread: MessageThread, user: User) -> int:
        """
        Mark all messages in thread as read for user
        
        Args:
            thread: Thread to mark as read
            user: User marking as read
            
        Returns:
            Number of messages marked as read
        """
        unread_messages = thread.messages.exclude(read_receipts__user=user)
        
        # Filter internal notes for clients
        if user.role == 'CLIENT':
            unread_messages = unread_messages.filter(is_internal_note=False)
        
        count = 0
        with transaction.atomic():
            for message in unread_messages:
                message.mark_as_read_by(user)
                count += 1
        
        logger.info(f"Marked {count} messages as read for user {user.id} in thread {thread.id}")
        return count
    
    @staticmethod
    def assign_thread(
        thread: MessageThread,
        admin: User,
        assigned_by: Optional[User] = None
    ) -> MessageThread:
        """
        Assign thread to admin user
        
        Args:
            thread: Thread to assign
            admin: Admin user to assign to
            assigned_by: User making the assignment
            
        Returns:
            Updated MessageThread instance
        """
        if admin.role != 'ADMIN':
            raise ValueError("Can only assign threads to admin users")
        
        old_admin = thread.assigned_admin
        thread.assigned_admin = admin
        thread.save()
        
        # Add admin as participant
        thread.add_participant(admin)
        
        logger.info(f"Thread {thread.id} assigned to admin {admin.id}")
        return thread
    
    # WebSocket Broadcasting Methods
    
    @staticmethod
    def broadcast_new_message(message: Message):
        """Broadcast new message to thread participants via WebSocket"""
        MessagingService._broadcast_to_thread(
            message.thread,
            {
                'type': 'new_message',
                'message': {
                    'id': str(message.id),
                    'thread_id': str(message.thread.id),
                    'sender_id': message.sender.id,
                    'sender_name': message.sender.get_display_name(),
                    'content': message.content,
                    'message_type': message.message_type,
                    'is_internal_note': message.is_internal_note,
                    'created_at': message.created_at.isoformat(),
                    'attachments': [
                        {
                            'id': str(att.id),
                            'filename': att.filename,
                            'file_size': att.file_size,
                            'file_type': att.file_type
                        }
                        for att in message.attachments.all()
                    ]
                }
            }
        )
    
    @staticmethod
    def broadcast_message_edited(message: Message):
        """Broadcast message edit to thread participants"""
        MessagingService._broadcast_to_thread(
            message.thread,
            {
                'type': 'message_edited',
                'message': {
                    'id': str(message.id),
                    'content': message.content,
                    'edited_at': message.edited_at.isoformat() if message.edited_at else None
                }
            }
        )
    
    @staticmethod
    def broadcast_message_deleted(message: Message):
        """Broadcast message deletion to thread participants"""
        MessagingService._broadcast_to_thread(
            message.thread,
            {
                'type': 'message_deleted',
                'message_id': str(message.id)
            }
        )
    
    @staticmethod
    def broadcast_message_read(message: Message, user: User):
        """Broadcast message read receipt to thread participants"""
        MessagingService._broadcast_to_thread(
            message.thread,
            {
                'type': 'message_read',
                'message_id': str(message.id),
                'user_id': user.id,
                'user_name': user.get_display_name(),
                'read_at': timezone.now().isoformat()
            },
            exclude_user=user
        )
    
    @staticmethod
    def broadcast_thread_read(thread: MessageThread, user: User):
        """Broadcast thread read status to participants"""
        MessagingService._broadcast_to_thread(
            thread,
            {
                'type': 'thread_read',
                'thread_id': str(thread.id),
                'user_id': user.id,
                'user_name': user.get_display_name(),
                'read_at': timezone.now().isoformat()
            },
            exclude_user=user
        )
    
    @staticmethod
    def broadcast_typing_status(typing_indicator: TypingIndicator):
        """Broadcast typing status to thread participants"""
        MessagingService._broadcast_to_thread(
            typing_indicator.thread,
            {
                'type': 'typing_status',
                'thread_id': str(typing_indicator.thread.id),
                'user_id': typing_indicator.user.id,
                'user_name': typing_indicator.user.get_display_name(),
                'is_typing': typing_indicator.is_typing,
                'last_activity': typing_indicator.last_activity.isoformat()
            },
            exclude_user=typing_indicator.user
        )
    
    @staticmethod
    def broadcast_thread_status_changed(thread: MessageThread, old_status: str):
        """Broadcast thread status change to participants"""
        MessagingService._broadcast_to_thread(
            thread,
            {
                'type': 'thread_status_changed',
                'thread_id': str(thread.id),
                'old_status': old_status,
                'new_status': thread.status,
                'updated_at': timezone.now().isoformat()
            }
        )
    
    @staticmethod
    def broadcast_thread_assigned(thread: MessageThread, old_admin: Optional[User]):
        """Broadcast thread assignment change to participants"""
        MessagingService._broadcast_to_thread(
            thread,
            {
                'type': 'thread_assigned',
                'thread_id': str(thread.id),
                'old_admin_id': old_admin.id if old_admin else None,
                'new_admin_id': thread.assigned_admin.id if thread.assigned_admin else None,
                'new_admin_name': thread.assigned_admin.get_display_name() if thread.assigned_admin else None,
                'updated_at': timezone.now().isoformat()
            }
        )
    
    @staticmethod
    def _broadcast_to_thread(
        thread: MessageThread,
        message_data: Dict[str, Any],
        exclude_user: Optional[User] = None
    ):
        """
        Broadcast message to all participants in a thread
        
        Args:
            thread: Thread to broadcast to
            message_data: Data to broadcast
            exclude_user: Optional user to exclude from broadcast
        """
        channel_layer = get_channel_layer()
        if not channel_layer:
            logger.warning("No channel layer configured for WebSocket broadcasting")
            return
        
        # Get active participants
        participants = thread.participants.filter(is_active=True).select_related('user')
        
        for participant in participants:
            # Skip excluded user
            if exclude_user and participant.user == exclude_user:
                continue
            
            # Filter internal notes for clients
            if (participant.user.role == 'CLIENT' and 
                message_data.get('type') == 'new_message' and
                message_data.get('message', {}).get('is_internal_note')):
                continue
            
            # Send to user's personal channel
            group_name = f"user_{participant.user.id}"
            
            try:
                async_to_sync(channel_layer.group_send)(
                    group_name,
                    {
                        'type': 'messaging_update',
                        'data': message_data
                    }
                )
            except Exception as e:
                logger.error(f"Failed to broadcast to user {participant.user.id}: {e}")


class NotificationService:
    """
    Service class for handling messaging-related notifications
    """
    
    @staticmethod
    def notify_new_message(message: Message):
        """Send push notifications for new message"""
        # Get participants who should be notified
        participants = message.thread.participants.filter(
            is_active=True,
            notifications_enabled=True
        ).exclude(user=message.sender).select_related('user')
        
        for participant in participants:
            # Skip internal notes for clients
            if (participant.user.role == 'CLIENT' and message.is_internal_note):
                continue
            
            # Create notification (using notification service if available)
            NotificationService._create_notification(
                user=participant.user,
                title="New Message",
                message=f"New message from {message.sender.get_display_name()}",
                data={
                    'type': 'new_message',
                    'thread_id': str(message.thread.id),
                    'message_id': str(message.id)
                }
            )
    
    @staticmethod
    def notify_thread_created(thread: MessageThread, created_by: User):
        """Send notification when thread is created"""
        if thread.client != created_by:
            NotificationService._create_notification(
                user=thread.client,
                title="New Conversation",
                message=f"New conversation started by {created_by.get_display_name()}",
                data={
                    'type': 'thread_created',
                    'thread_id': str(thread.id)
                }
            )
    
    @staticmethod
    def notify_thread_assigned(thread: MessageThread, old_admin: Optional[User]):
        """Send notification when thread is assigned"""
        if thread.assigned_admin:
            NotificationService._create_notification(
                user=thread.assigned_admin,
                title="Thread Assigned",
                message=f"You have been assigned to a conversation with {thread.client.get_display_name()}",
                data={
                    'type': 'thread_assigned',
                    'thread_id': str(thread.id)
                }
            )
        
        # Notify client of assignment
        NotificationService._create_notification(
            user=thread.client,
            title="Support Assigned",
            message=f"Your conversation has been assigned to {thread.assigned_admin.get_display_name()}",
            data={
                'type': 'thread_assigned',
                'thread_id': str(thread.id)
            }
        )
    
    @staticmethod
    def notify_thread_status_changed(thread: MessageThread, old_status: str):
        """Send notification when thread status changes"""
        if thread.status == 'resolved':
            NotificationService._create_notification(
                user=thread.client,
                title="Conversation Resolved",
                message="Your conversation has been marked as resolved",
                data={
                    'type': 'thread_resolved',
                    'thread_id': str(thread.id)
                }
            )
    
    @staticmethod
    def notify_thread_marked_urgent(thread: MessageThread):
        """Send notification when thread is marked urgent"""
        if thread.assigned_admin:
            NotificationService._create_notification(
                user=thread.assigned_admin,
                title="Urgent Conversation",
                message=f"Conversation with {thread.client.get_display_name()} marked as urgent",
                data={
                    'type': 'thread_urgent',
                    'thread_id': str(thread.id)
                }
            )
    
    @staticmethod
    def notify_thread_resolved(thread: MessageThread):
        """Send notification when thread is resolved"""
        NotificationService._create_notification(
            user=thread.client,
            title="Conversation Resolved",
            message="Your conversation has been resolved",
            data={
                'type': 'thread_resolved',
                'thread_id': str(thread.id)
            }
        )
    
    @staticmethod
    def notify_thread_reopened(thread: MessageThread):
        """Send notification when thread is reopened"""
        if thread.assigned_admin:
            NotificationService._create_notification(
                user=thread.assigned_admin,
                title="Conversation Reopened",
                message=f"Conversation with {thread.client.get_display_name()} has been reopened",
                data={
                    'type': 'thread_reopened',
                    'thread_id': str(thread.id)
                }
            )
    
    @staticmethod
    def _create_notification(user: User, title: str, message: str, data: Dict[str, Any]):
        """
        Create notification for user
        
        This method should integrate with the notifications domain
        when it's available, or implement basic notification storage.
        """
        try:
            # Try to use the notifications service if available
            from core.domains.notifications.services import NotificationService as NotifService
            NotifService.create_notification(
                user=user,
                title=title,
                message=message,
                data=data,
                category='messaging'
            )
        except ImportError:
            # Fallback: log notification (could store in database)
            logger.info(f"Notification for user {user.id}: {title} - {message}")
        except Exception as e:
            logger.error(f"Failed to create notification for user {user.id}: {e}")


class ThreadService:
    """
    Service class for thread-specific operations
    """
    
    @staticmethod
    def get_user_threads(
        user: User,
        status_filter: Optional[str] = None,
        priority_filter: Optional[str] = None,
        unassigned_only: bool = False,
        assigned_to_me_only: bool = False
    ) -> List[MessageThread]:
        """
        Get threads for a user with optional filtering
        
        Args:
            user: User to get threads for
            status_filter: Optional status filter
            priority_filter: Optional priority filter
            unassigned_only: Only get unassigned threads (admin only)
            assigned_to_me_only: Only get threads assigned to me (admin only)
            
        Returns:
            List of MessageThread instances
        """
        if user.role == 'CLIENT':
            queryset = MessageThread.objects.filter(client=user)
        else:  # ADMIN
            queryset = MessageThread.objects.all()
            
            if unassigned_only:
                queryset = queryset.filter(assigned_admin__isnull=True)
            elif assigned_to_me_only:
                queryset = queryset.filter(assigned_admin=user)
        
        # Apply filters
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if priority_filter:
            queryset = queryset.filter(priority=priority_filter)
        
        # Optimize query
        queryset = queryset.select_related('client', 'assigned_admin', 'event')
        queryset = queryset.with_unread_counts(user.id)
        queryset = queryset.order_by('-last_message_at')
        
        return list(queryset)
    
    @staticmethod
    def get_thread_stats(user: Optional[User] = None) -> Dict[str, int]:
        """
        Get thread statistics
        
        Args:
            user: Optional user to filter stats for (admin only)
            
        Returns:
            Dictionary with thread statistics
        """
        if user and user.role == 'CLIENT':
            queryset = MessageThread.objects.filter(client=user)
        else:
            queryset = MessageThread.objects.all()
            if user and user.role == 'ADMIN':
                # Admin-specific stats
                pass
        
        stats = {
            'total': queryset.count(),
            'active': queryset.filter(status='active').count(),
            'waiting': queryset.filter(status='waiting').count(),
            'resolved': queryset.filter(status='resolved').count(),
            'urgent': queryset.filter(priority='urgent').count(),
            'high': queryset.filter(priority='high').count(),
            'normal': queryset.filter(priority='normal').count(),
            'low': queryset.filter(priority='low').count(),
        }
        
        if user and user.role == 'ADMIN':
            stats.update({
                'unassigned': queryset.filter(assigned_admin__isnull=True).count(),
                'assigned_to_me': queryset.filter(assigned_admin=user).count(),
            })
        
        return stats