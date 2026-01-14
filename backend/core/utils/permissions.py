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


class IsClientOwnerOrAdmin(permissions.BasePermission):
    """
    Permission for financial objects - clients can access their own financial data,
    admins can access everything.
    """
    message = "You can only access your own financial data."

    def has_permission(self, request, view):
        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Allow admins and superusers full access
        if request.user.role == 'ADMIN' or request.user.is_superuser:
            return True
        
        # For client users, check if they can access this financial object
        if request.user.role == 'CLIENT':
            # Payment objects - check via event.client
            if hasattr(obj, 'event') and hasattr(obj.event, 'client'):
                return obj.event.client == request.user
            
            # Invoice objects - check via client field
            if hasattr(obj, 'client'):
                return obj.client == request.user
                
            # Payment method objects - check via user field
            if hasattr(obj, 'user'):
                return obj.user == request.user
                
            # Payment plan objects - check via event.client
            if hasattr(obj, 'event') and hasattr(obj.event, 'client'):
                return obj.event.client == request.user
                
            # Installment objects - check via payment_plan.event.client
            if hasattr(obj, 'payment_plan') and hasattr(obj.payment_plan, 'event') and hasattr(obj.payment_plan.event, 'client'):
                return obj.payment_plan.event.client == request.user
                
            # Refund objects - check via payment.event.client
            if hasattr(obj, 'payment') and hasattr(obj.payment, 'event') and hasattr(obj.payment.event, 'client'):
                return obj.payment.event.client == request.user

        return False


# =============================================================================
# Granular Admin Permission Classes
# =============================================================================

class HasAdminPermission(permissions.BasePermission):
    """
    Base class for checking specific admin permissions.
    Subclass and set `required_permission` attribute to the permission key.

    Usage:
        class CanManageWorkflows(HasAdminPermission):
            required_permission = 'can_manage_workflows'
    """
    required_permission = None
    message = "You don't have permission to perform this action."

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.role != 'ADMIN' and not request.user.is_superuser:
            return False
        if self.required_permission is None:
            return True
        return request.user.has_admin_permission(self.required_permission)


class CanManageCompanySettings(HasAdminPermission):
    """Permission to manage company settings, branding, and contact info."""
    required_permission = 'can_manage_company_settings'
    message = "You don't have permission to manage company settings."


class CanManageAdmins(HasAdminPermission):
    """Permission to invite admins and edit admin permissions."""
    required_permission = 'can_manage_admins'
    message = "You don't have permission to manage admin users."


class CanManageFinancialSettings(HasAdminPermission):
    """Permission to manage currency, tax rates, and payment terms."""
    required_permission = 'can_manage_financial_settings'
    message = "You don't have permission to manage financial settings."


class CanManagePaymentGateways(HasAdminPermission):
    """Permission to manage payment gateway configuration (Stripe, PayMongo)."""
    required_permission = 'can_manage_payment_gateways'
    message = "You don't have permission to manage payment gateways."


class CanManageWorkflows(HasAdminPermission):
    """Permission to manage workflow templates and automation rules."""
    required_permission = 'can_manage_workflows'
    message = "You don't have permission to manage workflows."


class CanManageBookingFlows(HasAdminPermission):
    """Permission to manage booking flow steps and settings."""
    required_permission = 'can_manage_booking_flows'
    message = "You don't have permission to manage booking flows."


class CanManageTemplates(HasAdminPermission):
    """Permission to manage contract, email, and SMS templates."""
    required_permission = 'can_manage_templates'
    message = "You don't have permission to manage templates."


class CanExportData(HasAdminPermission):
    """Permission to export data and generate reports."""
    required_permission = 'can_export_data'
    message = "You don't have permission to export data."


class CanDeleteRecords(HasAdminPermission):
    """Permission to permanently delete records."""
    required_permission = 'can_delete_records'
    message = "You don't have permission to delete records."


def check_admin_permission(user, permission_key):
    """
    Utility function to check if a user has a specific admin permission.

    Args:
        user: The user to check permissions for
        permission_key: The permission key to check (e.g., 'can_manage_workflows')

    Returns:
        bool: True if user has the permission, False otherwise
    """
    if not user or not user.is_authenticated:
        return False
    return user.has_admin_permission(permission_key)