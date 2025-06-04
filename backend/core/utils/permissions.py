# backend/core/utils/permissions.py
from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    """
    Permission to only allow admin users to access the view.
    """
    message = "Admin access required."

    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.role == 'ADMIN' or request.user.is_superuser
        )


class IsClient(permissions.BasePermission):
    """
    Permission to only allow client users to access the view.
    """
    message = "Client access required."

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'CLIENT'
    
class IsAdminOrClient(permissions.BasePermission):
    """
    Allows access to either admin or client users.
    """
    def has_permission(self, request, view):
        return (request.user and request.user.is_authenticated and 
                (request.user.role == 'ADMIN' or request.user.role == 'CLIENT'))


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Object-level permission to only allow owners of an object or admins to edit it.
    """
    message = "You must be the owner of this object or an admin."

    def has_object_permission(self, request, view, obj):
        # Allow admins and superusers full access
        if request.user.role == 'ADMIN' or request.user.is_superuser:
            return True
            
        # Check if the object has a user attribute or is a user itself
        if hasattr(obj, 'user'):
            return obj.user == request.user
        return obj == request.user