/**
 * Admin permission types and constants for granular access control.
 */

// Permission keys - must match backend permissions_constants.py
export type AdminPermissionKey =
  | 'can_manage_company_settings'
  | 'can_manage_admins'
  | 'can_manage_financial_settings'
  | 'can_manage_payment_gateways'
  | 'can_manage_workflows'
  | 'can_manage_booking_flows'
  | 'can_manage_templates'
  | 'can_export_data'
  | 'can_delete_records';

// Permission object type
export type AdminPermissions = Record<AdminPermissionKey, boolean>;

// Permission preset type
export interface PermissionPreset {
  label: string;
  description: string;
  permissions: AdminPermissions;
}

// Presets response from backend
export interface PermissionPresetsResponse {
  presets: Record<string, PermissionPreset>;
  descriptions: Record<AdminPermissionKey, string>;
  labels: Record<AdminPermissionKey, string>;
}

// Default permissions (all false = limited admin)
export const DEFAULT_ADMIN_PERMISSIONS: AdminPermissions = {
  can_manage_company_settings: false,
  can_manage_admins: false,
  can_manage_financial_settings: false,
  can_manage_payment_gateways: false,
  can_manage_workflows: false,
  can_manage_booking_flows: false,
  can_manage_templates: false,
  can_export_data: false,
  can_delete_records: false,
};

// Full admin permissions (all true)
export const FULL_ADMIN_PERMISSIONS: AdminPermissions = {
  can_manage_company_settings: true,
  can_manage_admins: true,
  can_manage_financial_settings: true,
  can_manage_payment_gateways: true,
  can_manage_workflows: true,
  can_manage_booking_flows: true,
  can_manage_templates: true,
  can_export_data: true,
  can_delete_records: true,
};

// Human-readable labels for permissions (for UI)
export const PERMISSION_LABELS: Record<AdminPermissionKey, string> = {
  can_manage_company_settings: 'Manage Company Settings',
  can_manage_admins: 'Manage Admin Users',
  can_manage_financial_settings: 'Manage Financial Settings',
  can_manage_payment_gateways: 'Manage Payment Gateways',
  can_manage_workflows: 'Manage Workflows',
  can_manage_booking_flows: 'Manage Booking Flows',
  can_manage_templates: 'Manage Templates',
  can_export_data: 'Export Data',
  can_delete_records: 'Delete Records',
};

// Human-readable descriptions for permissions (for UI)
export const PERMISSION_DESCRIPTIONS: Record<AdminPermissionKey, string> = {
  can_manage_company_settings: 'Company profile, branding, and contact information',
  can_manage_admins: 'Invite new admins and edit other admin permissions',
  can_manage_financial_settings: 'Currency, tax rates, and payment terms',
  can_manage_payment_gateways: 'Stripe, PayMongo, and other payment gateway setup',
  can_manage_workflows: 'Workflow templates and automation rules',
  can_manage_booking_flows: 'Booking flow steps and settings',
  can_manage_templates: 'Contract, email, and SMS templates',
  can_export_data: 'Export data and generate reports',
  can_delete_records: 'Permanently delete clients, events, and records',
};

// Permission to settings page mapping (for determining which permissions apply to which pages)
export const PERMISSION_PAGE_MAPPING: Record<string, AdminPermissionKey[]> = {
  '/settings/account/company': ['can_manage_company_settings'],
  '/settings/account/admin-users': ['can_manage_admins'],
  '/settings/commerce/currency-taxes': ['can_manage_financial_settings'],
  '/settings/commerce/payments': ['can_manage_payment_gateways'],
  '/settings/commerce/products': ['can_manage_financial_settings'],
  '/settings/commerce/categories': ['can_manage_financial_settings'],
  '/settings/commerce/discounts': ['can_manage_financial_settings'],
  '/settings/commerce/sales': ['can_manage_financial_settings'],
  '/settings/booking/booking-flows': ['can_manage_booking_flows'],
  '/settings/booking/event-types': ['can_manage_booking_flows'],
  '/settings/templates/workflow-templates': ['can_manage_workflows'],
  '/settings/templates/contract-templates': ['can_manage_templates'],
  '/settings/templates/communication-templates': ['can_manage_templates'],
  '/settings/templates/questionnaire-templates': ['can_manage_templates'],
  '/settings/legal': ['can_manage_company_settings'],
  '/settings/vip': ['can_manage_financial_settings'],
};

// Get required permissions for a given path
export const getPagePermissions = (path: string): AdminPermissionKey[] => {
  return PERMISSION_PAGE_MAPPING[path] || [];
};

// List of all permission keys (useful for iteration)
export const ALL_PERMISSION_KEYS: AdminPermissionKey[] = [
  'can_manage_company_settings',
  'can_manage_admins',
  'can_manage_financial_settings',
  'can_manage_payment_gateways',
  'can_manage_workflows',
  'can_manage_booking_flows',
  'can_manage_templates',
  'can_export_data',
  'can_delete_records',
];
