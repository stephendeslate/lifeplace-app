// frontend/admin-crm/src/types/settings.types.ts

import type { SvgIconComponent } from '@mui/icons-material';

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