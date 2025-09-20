# backend/core/domains/sales/permissions.py
from rest_framework import permissions


class IsQuoteOwner(permissions.BasePermission):
    """
    Permission that allows clients to only access quotes for their own events.
    """

    def has_permission(self, request, view):
        """
        Check if user is authenticated and has CLIENT role
        """
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == 'CLIENT'
        )

    def has_object_permission(self, request, view, obj):
        """
        Check if the quote belongs to an event owned by the requesting client
        """
        return obj.event.client == request.user


class IsClientQuoteAccessible(permissions.BasePermission):
    """
    Permission that ensures quotes are accessible to clients only if they are SENT, ACCEPTED, or REJECTED.
    Draft quotes should not be visible to clients.
    """

    def has_permission(self, request, view):
        """
        Check if user is authenticated and has CLIENT role
        """
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == 'CLIENT'
        )

    def has_object_permission(self, request, view, obj):
        """
        Check if the quote is in a state where client should have access:
        - Quote belongs to client's event
        - Quote status is SENT, ACCEPTED, or REJECTED (not DRAFT or EXPIRED)
        """
        is_owner = obj.event.client == request.user
        is_accessible_status = obj.status in ['SENT', 'ACCEPTED', 'REJECTED']

        return is_owner and is_accessible_status