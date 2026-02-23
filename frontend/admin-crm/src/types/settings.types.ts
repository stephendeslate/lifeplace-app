// frontend/admin-crm/src/types/settings.types.ts

import type { SvgIconComponent } from '@mui/icons-material';
import type { AdminPermissions } from './permissions.types';

export interface SettingsNavigationItem {
  id: string;
  label: string;
  path: string;
  icon: SvgIconComponent;
  description?: string;
}

export interface SettingsNavigationGroup {
  id: string;
  label: string;
  items: SettingsNavigationItem[];
}

export interface AccountSettingsFormData {
  first_name: string;
  last_name: string;
  email: string;
  profile: {
    phone?: string;
    company?: string;
  };
}

export interface PasswordChangeFormData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface AdminUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  date_joined: string;
  profile: {
    phone?: string;
    company?: string;
  };
  admin_permissions?: AdminPermissions;
  is_full_admin?: boolean;
}

export interface AdminInvitation {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  invited_by: string;
  is_accepted: boolean;
  expires_at: string;
  created_at: string;
  permissions?: AdminPermissions;
}

export interface InviteAdminFormData {
  email: string;
  first_name: string;
  last_name: string;
  permissions?: AdminPermissions;
}

export interface AcceptInvitationFormData {
  password: string;
  confirm_password: string;
}

export interface AcceptInvitationResponse {
  message: string;
  tokens: {
    access: string;
    refresh: string;
  };
  user: AdminUser;
}

export interface CreateAdminUserData {
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active?: boolean;
  profile?: {
    phone?: string;
    company?: string;
  };
}

export interface UpdateAdminUserData {
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  is_active?: boolean;
  profile?: {
    phone?: string;
    company?: string;
  };
}

export interface SettingsCardProps {
  title: string;
  description?: string;
  icon?: SvgIconComponent;
  children: React.ReactNode;
  action?: React.ReactNode;
}

export interface SettingsFormProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  onSubmit: (event: React.FormEvent) => void;
  isLoading?: boolean;
  submitLabel?: string;
}

export interface LegalDocument {
  id: number;
  document_type: 'TERMS_OF_SERVICE' | 'PRIVACY_POLICY';
  document_type_display: string;
  title: string;
  content: string;
  version: string;
  effective_date: string | null;
  is_published: boolean;
  last_updated_by: number | null;
  last_updated_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface LegalDocumentUpdateData {
  title?: string;
  content?: string;
  version?: string;
  effective_date?: string | null;
  is_published?: boolean;
}

/**
 * Company Settings - Branding and business information
 */
export interface CompanySettings {
  id: number;
  company_name: string;
  company_tagline: string;
  logo: string | null;
  logo_url: string | null;
  logo_dark: string | null;
  logo_dark_url: string | null;
  favicon: string | null;
  favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  email: string;
  support_email: string;
  phone: string;
  phone_secondary: string;
  address_line1: string;
  address_line2: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  full_address: string;
  business_registration_number: string;
  vat_number: string;
  website: string;
  facebook_url: string;
  instagram_url: string;
  pdf_footer_text: string;
  invoice_terms: string;
  receipt_terms: string;
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
  bank_branch: string;
  bank_swift_code: string;
  created_at: string;
  updated_at: string;
}

export interface CompanySettingsUpdateData {
  company_name?: string;
  company_tagline?: string;
  logo?: File | null;
  logo_dark?: File | null;
  favicon?: File | null;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  email?: string;
  support_email?: string;
  phone?: string;
  phone_secondary?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country?: string;
  business_registration_number?: string;
  vat_number?: string;
  website?: string;
  facebook_url?: string;
  instagram_url?: string;
  pdf_footer_text?: string;
  invoice_terms?: string;
  receipt_terms?: string;
  bank_name?: string;
  bank_account_name?: string;
  bank_account_number?: string;
  bank_branch?: string;
  bank_swift_code?: string;
}
