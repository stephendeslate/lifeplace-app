// frontend/admin-crm/src/types/layouts.types.ts

export interface EmailLayout {
  id: number;
  name: string;
  description: string;
  header_template: string;
  footer_template: string;
  wrapper_template: string;
  base_styles: string;
  primary_color: string;
  secondary_color: string;
  logo_url: string;
  is_default: boolean;
  is_active: boolean;
  template_count: number;
  created_at: string;
  updated_at: string;
}

export interface EmailLayoutHistory {
  id: number;
  version: number;
  name: string;
  description: string;
  header_template: string;
  footer_template: string;
  wrapper_template: string;
  base_styles: string;
  primary_color: string;
  secondary_color: string;
  logo_url: string;
  reason: 'CREATE' | 'UPDATE' | 'ROLLBACK';
  notes: string;
  changed_by: number | null;
  changed_by_name: string | null;
  created_at: string;
}

export interface CreateLayoutData {
  name: string;
  description?: string;
  header_template: string;
  footer_template: string;
  wrapper_template: string;
  base_styles?: string;
  primary_color?: string;
  secondary_color?: string;
  logo_url?: string;
  is_default?: boolean;
  is_active?: boolean;
}

export type UpdateLayoutData = Partial<CreateLayoutData> & {
  notes?: string;
};

export interface LayoutPreviewData {
  sample_content?: string;
  header_title?: string;
  header_subtitle?: string;
  context_data?: Record<string, unknown>;
}

export interface LayoutPreviewResult {
  html: string;
}

export interface LayoutFilters {
  is_active?: boolean;
}
