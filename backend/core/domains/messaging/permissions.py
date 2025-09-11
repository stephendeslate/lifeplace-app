"""
Permission System for Messaging Domain
Provides role-based access control and thread-level permissions for WebSocket messaging
"""

import logging
from typing import Optional, Dict, Any, List
from enum import Enum

from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied
from django.db import models
from django.utils.translation import gettext_lazy as _

from channels.db import database_sync_to_async

from core.utils.security_logging import SecurityLogger, SecurityEventType, SecuritySeverity

User = get_user_model()
logger = logging.getLogger(__name__)
security_logger = SecurityLogger()


class MessagePermissionLevel(models.TextChoices):
    """Permission levels for message access"""
    NONE = 'NONE', 'No Access'
    READ = 'READ', 'Read Only'
    WRITE = 'WRITE', 'Read and Write'
    ADMIN = 'ADMIN', 'Full Administrative Access'


class MessageAction(models.TextChoices):
    """Actions that can be performed on messages"""
    VIEW_THREAD = 'VIEW_THREAD', 'View Message Thread'
    SEND_MESSAGE = 'SEND_MESSAGE', 'Send Message'
    EDIT_MESSAGE = 'EDIT_MESSAGE', 'Edit Message'
    DELETE_MESSAGE = 'DELETE_MESSAGE', 'Delete Message'
    MANAGE_THREAD = 'MANAGE_THREAD', 'Manage Thread'
    VIEW_ALL_THREADS = 'VIEW_ALL_THREADS', 'View All Threads'
    MODERATE_CONTENT = 'MODERATE_CONTENT', 'Moderate Content'


class BaseMessagePermission:
    """Base class for message permissions"""
    
    def __init__(self, user: User):
        self.user = user
    
    def has_permission(self, action: str, **context) -> bool:
        """Check if user has permission for action"""
        raise NotImplementedError
    
    def get_permission_level(self, **context) -> str:
        """Get permission level for context"""
        raise NotImplementedError


class ThreadPermission(BaseMessagePermission):
    """Permission checker for message threads"""
    
    async def has_permission(self, action: str, thread_id: Optional[int] = None, **context) -> bool:
        """
        Check if user has permission for specific action on thread
        
        Args:
            action: Action to check (from MessageAction)
            thread_id: Thread ID if applicable
            **context: Additional context for permission checking
        """
        if not self.user or self.user.is_anonymous:
            return False
        
        # Admin users have full access
        if self.user.role == 'ADMIN':
            await self._log_permission_check(action, thread_id, True, 'Admin access')
            return True
        
        # Client users have limited access
        if self.user.role == 'CLIENT':
            return await self._check_client_permission(action, thread_id, **context)
        
        # Default deny
        await self._log_permission_check(action, thread_id, False, 'Unknown user role')
        return False
    
    async def _check_client_permission(self, action: str, thread_id: Optional[int], **context) -> bool:
        """Check permissions for client users"""
        
        if action == MessageAction.VIEW_ALL_THREADS:
            # Clients cannot view all threads
            await self._log_permission_check(action, thread_id, False, 'Clients cannot view all threads')
            return False
        
        if action == MessageAction.MODERATE_CONTENT:
            # Clients cannot moderate content
            await self._log_permission_check(action, thread_id, False, 'Clients cannot moderate content')
            return False
        
        if not thread_id:
            # No thread specified, check if action is allowed without thread context
            if action in [MessageAction.VIEW_THREAD, MessageAction.SEND_MESSAGE]:
                # These actions require thread context for clients
                await self._log_permission_check(action, thread_id, False, 'Thread context required')
                return False
        else:
            # Check if client is participant in the thread
            is_participant = await self._is_thread_participant(thread_id)
            if not is_participant:
                await self._log_permission_check(action, thread_id, False, 'Not a thread participant')
                return False
        
        # Check specific action permissions
        if action in [MessageAction.VIEW_THREAD, MessageAction.SEND_MESSAGE]:
            await self._log_permission_check(action, thread_id, True, 'Client thread access')
            return True
        
        if action in [MessageAction.EDIT_MESSAGE, MessageAction.DELETE_MESSAGE]:
            # Clients can only edit/delete their own messages
            message_id = context.get('message_id')
            if message_id:
                is_own_message = await self._is_own_message(message_id)
                if is_own_message:
                    await self._log_permission_check(action, thread_id, True, 'Own message access')
                    return True
            
            await self._log_permission_check(action, thread_id, False, 'Not own message')
            return False
        
        if action == MessageAction.MANAGE_THREAD:
            # Clients cannot manage threads
            await self._log_permission_check(action, thread_id, False, 'Clients cannot manage threads')
            return False
        
        # Default deny for unknown actions
        await self._log_permission_check(action, thread_id, False, f'Unknown action: {action}')
        return False
    
    @database_sync_to_async
    def _is_thread_participant(self, thread_id: int) -> bool:
        """Check if user is a participant in the thread"""
        try:
            # Import here to avoid circular imports
            from .models import MessageThread
            
            thread = MessageThread.objects.get(id=thread_id)
            
            # For client users, check if they're the client in the thread
            if self.user.role == 'CLIENT':
                # Assuming thread has a client field
                return hasattr(thread, 'client') and thread.client == self.user
            
            return False
        except Exception as e:
            logger.error(f"Error checking thread participation: {e}")
            return False
    
    @database_sync_to_async
    def _is_own_message(self, message_id: int) -> bool:
        """Check if user owns the message"""
        try:
            # Import here to avoid circular imports
            from .models import Message
            
            message = Message.objects.get(id=message_id)
            return message.sender == self.user
        except Exception as e:
            logger.error(f"Error checking message ownership: {e}")
            return False
    
    @database_sync_to_async
    def _log_permission_check(self, action: str, thread_id: Optional[int], granted: bool, reason: str):
        """Log permission check results"""
        security_logger.log_event(
            event_type=SecurityEventType.PERMISSION_DENIED if not granted else SecurityEventType.DATA_ACCESS,
            description=f"Permission check: {action} on thread {thread_id} - {'Granted' if granted else 'Denied'}",
            user=self.user,
            severity=SecuritySeverity.MEDIUM if not granted else SecuritySeverity.LOW,
            details={
                'action': action,
                'thread_id': thread_id,
                'granted': granted,
                'reason': reason,
                'user_role': self.user.role,
            },
            risk_score=30 if not granted else 5
        )


class WebSocketPermission(BaseMessagePermission):
    """Permission checker for WebSocket connections and actions"""
    
    async def can_connect(self, room_name: str, **context) -> bool:
        """Check if user can connect to a WebSocket room"""
        if not self.user or self.user.is_anonymous:
            await self._log_websocket_permission('connect', room_name, False, 'Anonymous user')
            return False
        
        # Parse room name to determine type and access requirements
        room_type, room_id = self._parse_room_name(room_name)
        
        if room_type == 'thread':
            # Check thread access permission
            thread_permission = ThreadPermission(self.user)
            can_access = await thread_permission.has_permission(
                MessageAction.VIEW_THREAD, 
                thread_id=room_id
            )
            await self._log_websocket_permission('connect', room_name, can_access, 
                                               f'Thread access check: {can_access}')
            return can_access
        
        elif room_type == 'admin':
            # Admin room access
            can_access = self.user.role == 'ADMIN'
            await self._log_websocket_permission('connect', room_name, can_access,
                                               f'Admin access check: {can_access}')
            return can_access
        
        elif room_type == 'user':
            # User-specific room access
            can_access = (self.user.role == 'ADMIN' or 
                         (self.user.role == 'CLIENT' and str(self.user.id) == str(room_id)))
            await self._log_websocket_permission('connect', room_name, can_access,
                                               f'User room access check: {can_access}')
            return can_access
        
        # Unknown room type - deny access
        await self._log_websocket_permission('connect', room_name, False, f'Unknown room type: {room_type}')
        return False
    
    async def can_send_message(self, room_name: str, message_data: Dict[str, Any]) -> bool:
        """Check if user can send message to room"""
        if not self.user or self.user.is_anonymous:
            return False
        
        room_type, room_id = self._parse_room_name(room_name)
        
        if room_type == 'thread':
            thread_permission = ThreadPermission(self.user)
            return await thread_permission.has_permission(
                MessageAction.SEND_MESSAGE,
                thread_id=room_id
            )
        
        # For other room types, if you can connect, you can send
        return await self.can_connect(room_name)
    
    def _parse_room_name(self, room_name: str) -> tuple:
        """
        Parse room name to extract type and ID
        Expected formats:
        - thread_<id>: Message thread
        - admin_<id>: Admin room
        - user_<id>: User-specific room
        """
        if '_' in room_name:
            parts = room_name.split('_', 1)
            if len(parts) == 2:
                room_type, room_id = parts
                try:
                    # Try to convert ID to int
                    room_id = int(room_id)
                    return room_type, room_id
                except ValueError:
                    # ID is not numeric, keep as string
                    return room_type, room_id
        
        # Default to treating entire name as room type
        return room_name, None
    
    @database_sync_to_async
    def _log_websocket_permission(self, action: str, room_name: str, granted: bool, reason: str):
        """Log WebSocket permission checks"""
        security_logger.log_event(
            event_type=SecurityEventType.PERMISSION_DENIED if not granted else SecurityEventType.DATA_ACCESS,
            description=f"WebSocket permission: {action} on room {room_name} - {'Granted' if granted else 'Denied'}",
            user=self.user,
            severity=SecuritySeverity.MEDIUM if not granted else SecuritySeverity.LOW,
            details={
                'action': action,
                'room_name': room_name,
                'granted': granted,
                'reason': reason,
                'user_role': self.user.role,
                'connection_type': 'websocket',
            },
            risk_score=25 if not granted else 5
        )


class AdminPermission(BaseMessagePermission):
    """Permission checker for admin-only actions"""
    
    async def has_admin_access(self, action: str, **context) -> bool:
        """Check if user has admin access for action"""
        if not self.user or self.user.is_anonymous:
            return False
        
        if self.user.role != 'ADMIN':
            await self._log_admin_permission(action, False, 'Not an admin user')
            return False
        
        # Admin users have access to admin actions
        await self._log_admin_permission(action, True, 'Admin access granted')
        return True
    
    async def can_moderate_content(self, **context) -> bool:
        """Check if user can moderate content"""
        return await self.has_admin_access(MessageAction.MODERATE_CONTENT, **context)
    
    async def can_view_all_threads(self, **context) -> bool:
        """Check if user can view all threads"""
        return await self.has_admin_access(MessageAction.VIEW_ALL_THREADS, **context)
    
    async def can_manage_threads(self, **context) -> bool:
        """Check if user can manage threads"""
        return await self.has_admin_access(MessageAction.MANAGE_THREAD, **context)
    
    @database_sync_to_async
    def _log_admin_permission(self, action: str, granted: bool, reason: str):
        """Log admin permission checks"""
        security_logger.log_event(
            event_type=SecurityEventType.ADMIN_ACTION if granted else SecurityEventType.PERMISSION_DENIED,
            description=f"Admin permission: {action} - {'Granted' if granted else 'Denied'}",
            user=self.user,
            severity=SecuritySeverity.LOW if granted else SecuritySeverity.MEDIUM,
            details={
                'action': action,
                'granted': granted,
                'reason': reason,
                'user_role': self.user.role,
            },
            risk_score=10 if granted else 30
        )


# Permission factory functions
def get_thread_permission(user: User) -> ThreadPermission:
    """Get thread permission checker for user"""
    return ThreadPermission(user)


def get_websocket_permission(user: User) -> WebSocketPermission:
    """Get WebSocket permission checker for user"""
    return WebSocketPermission(user)


def get_admin_permission(user: User) -> AdminPermission:
    """Get admin permission checker for user"""
    return AdminPermission(user)


# Decorator for permission checking
def require_permission(action: str, permission_class: BaseMessagePermission = None):
    """
    Decorator to require specific permission for async functions
    
    Usage:
        @require_permission(MessageAction.VIEW_THREAD, ThreadPermission)
        async def view_thread(self, thread_id):
            ...
    """
    def decorator(func):
        async def wrapper(self, *args, **kwargs):
            user = getattr(self, 'user', None)
            if not user:
                raise PermissionDenied("No user context")
            
            permission_checker = permission_class(user) if permission_class else ThreadPermission(user)
            
            # Extract context from kwargs
            context = {k: v for k, v in kwargs.items() if not k.startswith('_')}
            
            has_perm = await permission_checker.has_permission(action, **context)
            if not has_perm:
                raise PermissionDenied(f"Permission denied for action: {action}")
            
            return await func(self, *args, **kwargs)
        return wrapper
    return decorator