"""
Django signals for the messaging domain.

This module handles automatic WebSocket broadcasting and notifications
when messaging models are created, updated, or deleted.
"""

import logging
from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.utils import timezone

from .models import (
    MessageThread,
    Message,
    MessageReadReceipt,
    TypingIndicator
)
from .services import MessagingService, NotificationService

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Message)
def handle_message_created(sender, instance, created, **kwargs):
    """
    Handle new message creation.
    
    Automatically broadcasts the message to WebSocket connections
    and sends notifications to participants.
    """
    if created:
        logger.info(f"New message created: {instance.id} in thread {instance.thread.id}")
        
        # Broadcast to WebSocket connections
        try:
            MessagingService.broadcast_new_message(instance)
        except Exception as e:
            logger.error(f"Failed to broadcast new message {instance.id}: {e}")
        
        # Send push notifications
        try:
            NotificationService.notify_new_message(instance)
        except Exception as e:
            logger.error(f"Failed to send notifications for message {instance.id}: {e}")


@receiver(pre_save, sender=Message)
def handle_message_updated(sender, instance, **kwargs):
    """
    Handle message updates (edits).
    
    Tracks if a message is being edited and prepares for broadcasting.
    """
    if instance.pk:  # Only for existing messages
        try:
            # Get the original message to compare
            original = Message.objects.get(pk=instance.pk)
            
            # Check if content was changed (indicating an edit)
            if original.content != instance.content:
                # This will be an edit - store original content if not already stored
                if not instance.original_content:
                    instance.original_content = original.content
                
                # Set edited timestamp
                instance.edited_at = timezone.now()
                
                logger.info(f"Message {instance.id} being edited")
                
        except Message.DoesNotExist:
            # Message doesn't exist yet (shouldn't happen in pre_save)
            pass
        except Exception as e:
            logger.error(f"Error handling message update for {instance.id}: {e}")


@receiver(post_save, sender=Message)
def handle_message_edit_broadcast(sender, instance, created, **kwargs):
    """
    Handle broadcasting message edits.
    
    This runs after the message is saved and checks if it was edited.
    """
    if not created and instance.edited_at:
        logger.info(f"Message {instance.id} was edited, broadcasting update")
        
        try:
            MessagingService.broadcast_message_edited(instance)
        except Exception as e:
            logger.error(f"Failed to broadcast message edit {instance.id}: {e}")


@receiver(post_delete, sender=Message)
def handle_message_deleted(sender, instance, **kwargs):
    """
    Handle message deletion.
    
    Broadcasts the deletion to WebSocket connections.
    """
    logger.info(f"Message {instance.id} deleted from thread {instance.thread.id}")
    
    try:
        MessagingService.broadcast_message_deleted(instance)
    except Exception as e:
        logger.error(f"Failed to broadcast message deletion {instance.id}: {e}")


@receiver(post_save, sender=MessageReadReceipt)
def handle_message_read(sender, instance, created, **kwargs):
    """
    Handle message read receipts.
    
    Broadcasts read status to other participants in the thread.
    """
    if created:
        logger.info(f"Message {instance.message.id} marked as read by user {instance.user.id}")
        
        try:
            MessagingService.broadcast_message_read(instance.message, instance.user)
        except Exception as e:
            logger.error(f"Failed to broadcast read receipt for message {instance.message.id}: {e}")


@receiver(post_save, sender=MessageThread)
def handle_thread_created_or_updated(sender, instance, created, **kwargs):
    """
    Handle thread creation and updates.
    
    Sends notifications and broadcasts status changes.
    """
    if created:
        logger.info(f"New message thread created: {instance.id}")
        
        # Note: Thread creation notifications are handled in the view/service layer
        # to have access to the creating user context
        
    else:
        # Thread was updated - check what changed
        logger.info(f"Message thread {instance.id} updated")
        
        # Thread updates (status, assignment) are handled in the view/service layer
        # to have access to the old values and user context


@receiver(post_save, sender=TypingIndicator)
def handle_typing_indicator_updated(sender, instance, created, **kwargs):
    """
    Handle typing indicator updates.
    
    Broadcasts typing status to other participants.
    """
    logger.info(f"Typing indicator updated: user {instance.user.id} in thread {instance.thread.id} - typing: {instance.is_typing}")
    
    try:
        MessagingService.broadcast_typing_status(instance)
    except Exception as e:
        logger.error(f"Failed to broadcast typing indicator for user {instance.user.id}: {e}")


@receiver(post_delete, sender=TypingIndicator)
def handle_typing_indicator_deleted(sender, instance, **kwargs):
    """
    Handle typing indicator deletion (user stopped typing).
    
    Broadcasts that user stopped typing.
    """
    logger.info(f"Typing indicator deleted: user {instance.user.id} stopped typing in thread {instance.thread.id}")
    
    try:
        # Create a temporary indicator with is_typing=False for broadcasting
        temp_indicator = TypingIndicator(
            thread=instance.thread,
            user=instance.user,
            is_typing=False,
            last_activity=timezone.now()
        )
        MessagingService.broadcast_typing_status(temp_indicator)
    except Exception as e:
        logger.error(f"Failed to broadcast typing stop for user {instance.user.id}: {e}")


# Clean up stale typing indicators periodically
from django.db.models.signals import post_migrate

@receiver(post_migrate)
def setup_periodic_cleanup(sender, **kwargs):
    """
    Set up periodic tasks for cleaning up stale data.
    
    This runs after migrations and sets up cleanup tasks.
    """
    if sender.name == 'core.domains.messaging':
        logger.info("Setting up messaging cleanup tasks")
        
        # Here you would set up Celery periodic tasks or similar
        # For now, we'll just log that it should be set up
        
        # Example Celery task setup (if Celery is configured):
        # from celery import current_app
        # current_app.conf.beat_schedule.update({
        #     'cleanup-typing-indicators': {
        #         'task': 'core.domains.messaging.tasks.cleanup_typing_indicators',
        #         'schedule': 300.0,  # Every 5 minutes
        #     },
        # })


# Custom signal for thread status changes
from django.dispatch import Signal

thread_status_changed = Signal()
thread_assigned = Signal()
thread_priority_changed = Signal()

@receiver(thread_status_changed)
def handle_thread_status_change(sender, thread, old_status, new_status, **kwargs):
    """
    Handle thread status changes.
    
    Broadcasts status changes and sends notifications.
    """
    logger.info(f"Thread {thread.id} status changed from {old_status} to {new_status}")
    
    try:
        MessagingService.broadcast_thread_status_changed(thread, old_status)
        NotificationService.notify_thread_status_changed(thread, old_status)
    except Exception as e:
        logger.error(f"Failed to handle thread status change for {thread.id}: {e}")


@receiver(thread_assigned)
def handle_thread_assignment(sender, thread, old_admin, new_admin, **kwargs):
    """
    Handle thread assignment changes.
    
    Broadcasts assignment changes and sends notifications.
    """
    logger.info(f"Thread {thread.id} assigned from {old_admin} to {new_admin}")
    
    try:
        MessagingService.broadcast_thread_assigned(thread, old_admin)
        NotificationService.notify_thread_assigned(thread, old_admin)
    except Exception as e:
        logger.error(f"Failed to handle thread assignment for {thread.id}: {e}")


@receiver(thread_priority_changed)
def handle_thread_priority_change(sender, thread, old_priority, new_priority, **kwargs):
    """
    Handle thread priority changes.
    
    Sends notifications for urgent priority changes.
    """
    logger.info(f"Thread {thread.id} priority changed from {old_priority} to {new_priority}")
    
    try:
        if new_priority == 'urgent' and old_priority != 'urgent':
            NotificationService.notify_thread_marked_urgent(thread)
    except Exception as e:
        logger.error(f"Failed to handle thread priority change for {thread.id}: {e}")


# Auto-cleanup for old data
@receiver(post_save, sender=Message)
def schedule_cleanup_on_message_create(sender, instance, created, **kwargs):
    """
    Schedule cleanup tasks when messages are created.
    
    This helps keep the database clean by removing old data periodically.
    """
    if created and instance.id % 100 == 0:  # Every 100th message
        logger.info("Scheduling cleanup tasks")
        
        try:
            # Clean up old typing indicators
            TypingIndicator.cleanup_stale_indicators(older_than_minutes=5)
            
            # Here you could add more cleanup tasks:
            # - Remove old read receipts
            # - Archive old messages
            # - Clean up orphaned attachments
            
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")


# WebSocket connection tracking
active_connections = {}

def track_websocket_connection(user_id, channel_name, thread_id=None):
    """
    Track active WebSocket connections for users.
    
    This helps with presence detection and connection management.
    """
    if user_id not in active_connections:
        active_connections[user_id] = {}
    
    active_connections[user_id][channel_name] = {
        'thread_id': thread_id,
        'connected_at': timezone.now(),
        'last_activity': timezone.now()
    }
    
    logger.info(f"Tracking connection for user {user_id}: {channel_name}")


def untrack_websocket_connection(user_id, channel_name):
    """
    Remove tracking for WebSocket connection.
    """
    if user_id in active_connections and channel_name in active_connections[user_id]:
        del active_connections[user_id][channel_name]
        
        if not active_connections[user_id]:
            del active_connections[user_id]
        
        logger.info(f"Stopped tracking connection for user {user_id}: {channel_name}")


def get_active_connections(user_id=None, thread_id=None):
    """
    Get active WebSocket connections.
    
    Args:
        user_id: Optional user ID filter
        thread_id: Optional thread ID filter
        
    Returns:
        Dictionary of active connections
    """
    if user_id:
        return active_connections.get(user_id, {})
    
    if thread_id:
        connections = {}
        for uid, user_connections in active_connections.items():
            for channel, info in user_connections.items():
                if info.get('thread_id') == thread_id:
                    if uid not in connections:
                        connections[uid] = {}
                    connections[uid][channel] = info
        return connections
    
    return active_connections


def is_user_online(user_id):
    """
    Check if a user has any active WebSocket connections.
    
    Args:
        user_id: User ID to check
        
    Returns:
        Boolean indicating if user is online
    """
    return user_id in active_connections and len(active_connections[user_id]) > 0


def get_thread_participants_online(thread_id):
    """
    Get list of online participants for a thread.
    
    Args:
        thread_id: Thread ID to check
        
    Returns:
        List of user IDs who are online and have access to the thread
    """
    online_users = []
    
    try:
        thread = MessageThread.objects.get(id=thread_id)
        participants = thread.participants.filter(is_active=True).values_list('user_id', flat=True)
        
        for user_id in participants:
            if is_user_online(user_id):
                online_users.append(user_id)
                
    except Exception as e:
        logger.error(f"Error getting online participants for thread {thread_id}: {e}")
    
    return online_users