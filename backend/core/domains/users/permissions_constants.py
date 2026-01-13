"""
Admin permission constants and presets for granular access control.

This module defines all available admin permissions, their default values,
presets for common permission combinations, and descriptions for UI display.
"""

# All available admin permissions with their default values (all False = limited admin)
ADMIN_PERMISSIONS = {
    'can_manage_company_settings': False,    # Company profile, branding, contact info
    'can_manage_admins': False,              # Admin invitations, editing other admin permissions
    'can_manage_financial_settings': False,  # Currency, tax rates, payment terms
    'can_manage_payment_gateways': False,    # Stripe, PayMongo setup
    'can_manage_workflows': False,           # Workflow templates, automation rules
    'can_manage_booking_flows': False,       # Booking flow steps, settings
    'can_manage_templates': False,           # Contract templates, email/SMS templates
    'can_export_data': False,                # Bulk CSV exports, reports
    'can_delete_records': False,             # Permanent deletion of clients, events, etc.
}

# Full admin permissions (all True)
FULL_ADMIN_PERMISSIONS = {key: True for key in ADMIN_PERMISSIONS.keys()}

# Permission presets for quick selection
PERMISSION_PRESETS = {
    'full_admin': {
        'label': 'Full Admin',
        'description': 'Full access to all settings and features',
        'permissions': FULL_ADMIN_PERMISSIONS.copy()
    },
    'limited_admin': {
        'label': 'Limited Admin',
        'description': 'View-only access to settings, basic operations',
        'permissions': ADMIN_PERMISSIONS.copy()  # All False
    },
}

# Human-readable descriptions for each permission (used in UI)
PERMISSION_DESCRIPTIONS = {
    'can_manage_company_settings': 'Manage company profile, branding, and contact information',
    'can_manage_admins': 'Invite new admins and edit other admin permissions',
    'can_manage_financial_settings': 'Configure currency, tax rates, and payment terms',
    'can_manage_payment_gateways': 'Set up and configure payment gateways (Stripe, PayMongo)',
    'can_manage_workflows': 'Create and manage workflow templates and automation rules',
    'can_manage_booking_flows': 'Configure booking flow steps and settings',
    'can_manage_templates': 'Manage contract, email, and SMS templates',
    'can_export_data': 'Export data and generate reports',
    'can_delete_records': 'Permanently delete clients, events, and other records',
}

# Human-readable labels for each permission (used in UI)
PERMISSION_LABELS = {
    'can_manage_company_settings': 'Manage Company Settings',
    'can_manage_admins': 'Manage Admin Users',
    'can_manage_financial_settings': 'Manage Financial Settings',
    'can_manage_payment_gateways': 'Manage Payment Gateways',
    'can_manage_workflows': 'Manage Workflows',
    'can_manage_booking_flows': 'Manage Booking Flows',
    'can_manage_templates': 'Manage Templates',
    'can_export_data': 'Export Data',
    'can_delete_records': 'Delete Records',
}


def get_default_permissions():
    """Return a copy of the default (limited) admin permissions."""
    return ADMIN_PERMISSIONS.copy()


def get_full_permissions():
    """Return a copy of full admin permissions."""
    return FULL_ADMIN_PERMISSIONS.copy()


def validate_permissions(permissions_dict):
    """
    Validate that a permissions dictionary only contains valid permission keys.
    Returns a cleaned dictionary with only valid keys.
    """
    if not isinstance(permissions_dict, dict):
        return {}

    return {
        key: bool(value)
        for key, value in permissions_dict.items()
        if key in ADMIN_PERMISSIONS
    }
