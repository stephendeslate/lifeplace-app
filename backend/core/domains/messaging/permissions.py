from rest_framework import permissions

from core.utils.permissions import IsAdminOrClient


class CanAccessMessageThread(permissions.BasePermission):
    """
    Permission to access message threads based on role:
    - Admins can access any thread
    - Clients can only access threads where they are the client
    """

    message = "You don't have permission to access this thread."

    def has_object_permission(self, request, view, obj):
        # Admin users can access any thread
        if request.user.role == "ADMIN" or request.user.is_superuser:
            return True

        # Clients can only access their own threads
        if request.user.role == "CLIENT":
            return obj.client == request.user

        return False


class CanManageMessageThread(permissions.BasePermission):
    """
    Permission to manage (update/delete) message threads:
    - Only admins can manage threads
    """

    message = "Only admin users can manage message threads."

    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.role == "ADMIN" or request.user.is_superuser)

    def has_object_permission(self, request, view, obj):
        return request.user.role == "ADMIN" or request.user.is_superuser


class CanCreateInternalNote(permissions.BasePermission):
    """
    Permission to create internal notes:
    - Only admins can create internal notes
    """

    message = "Only admin users can create internal notes."

    def has_permission(self, request, view):
        # Check if the request is trying to create an internal note
        if request.method in permissions.SAFE_METHODS:
            return True

        is_internal_note = request.data.get("is_internal_note", False)
        if is_internal_note:
            return request.user.is_authenticated and (request.user.role == "ADMIN" or request.user.is_superuser)

        return True  # Non-internal notes can be created by anyone with thread access


class CanAccessMessage(permissions.BasePermission):
    """
    Permission to access messages:
    - Admins can see all messages including internal notes
    - Clients can only see non-internal messages in their threads
    """

    message = "You don't have permission to access this message."

    def has_object_permission(self, request, view, obj):
        # Check thread access first
        thread_permission = CanAccessMessageThread()
        if not thread_permission.has_object_permission(request, view, obj.thread):
            return False

        # Admin users can see all messages
        if request.user.role == "ADMIN" or request.user.is_superuser:
            return True

        # Clients cannot see internal notes
        return not obj.is_internal_note


class IsMessageSender(permissions.BasePermission):
    """
    Permission to edit messages:
    - Only the sender can edit their own messages
    """

    message = "You can only edit your own messages."

    def has_object_permission(self, request, view, obj):
        return obj.sender == request.user


class MessagingPermissions:
    """
    Convenience class to combine common messaging permissions
    """

    # Basic permissions
    authenticated = [permissions.IsAuthenticated]
    admin_only = [permissions.IsAuthenticated, CanManageMessageThread]
    admin_or_client = [IsAdminOrClient]

    # Thread permissions
    thread_access = [permissions.IsAuthenticated, CanAccessMessageThread]
    thread_manage = [permissions.IsAuthenticated, CanManageMessageThread]

    # Message permissions
    message_access = [permissions.IsAuthenticated, CanAccessMessage]
    message_edit = [permissions.IsAuthenticated, IsMessageSender]

    # Special permissions
    internal_note = [permissions.IsAuthenticated, CanCreateInternalNote]
