// frontend/admin-crm/src/types/communications.types.ts

import type { ContextType, VariableSchemas } from './templates.types';

// Re-export for convenience
export type { VariableSchemas };

export interface CommunicationTemplate {
  id: number;
  name: string;
  channel: 'EMAIL' | 'SMS';
  category: 'SYSTEM' | 'MANUAL' | 'AUTO';
  context_type: ContextType;
  context_type_display: string;
  include_client_context: boolean;
  include_event_context: boolean;
  subject_template?: string;
  body_template: string;
  is_system: boolean;
  layout: number | null;
  layout_name?: string;
  created_at: string;
  updated_at: string;
}

export interface CommunicationRecord {
  id: string;
  template_name: string;
  channel: 'EMAIL' | 'SMS';
  category: 'SYSTEM' | 'MANUAL' | 'AUTO';
  recipient: string;
  subject?: string;
  body: string;
  client?: number;
  client_email?: string;
  client_name?: string;
  sent_by?: number;
  sent_by_name?: string;
  event?: number;
  event_details?: {
    id: number;
    name: string;
  };
  external_message_id?: string;
  delivery_status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED';
  sent_at?: string;
  delivered_at?: string;
  opened_at?: string;
  is_opened: boolean;
  context_data: Record<string, unknown>;
  created_at: string;
}

export interface CreateTemplateData {
  name: string;
  channel: 'EMAIL' | 'SMS';
  category: 'SYSTEM' | 'MANUAL' | 'AUTO';
  context_type: ContextType;
  include_client_context?: boolean;
  include_event_context?: boolean;
  subject_template?: string;
  body_template: string;
  layout?: number | null;
}

export type UpdateTemplateData = Partial<CreateTemplateData>;

export interface SendCommunicationData {
  template_id: number;
  recipient: string;
  client_id?: number;
  context_data?: Record<string, unknown>;
}

export interface ManualSendData {
  template_id: number;
  recipient: string;
  client_id?: number;
  event_id?: number;
  context_data?: Record<string, unknown>;
  custom_subject?: string;
  custom_body?: string;
}

export interface BulkSendData {
  template_id: number;
  recipients: Array<{
    recipient: string;
    client_id?: number;
    context_data?: Record<string, unknown>;
  }>;
}

export interface PreviewData {
  template_id: number;
  context_data?: Record<string, unknown>;
  // Override parameters for live editing preview
  body_template?: string;
  subject_template?: string;
  layout_id?: number | null;
}

export interface ManualPreviewData extends PreviewData {
  custom_subject?: string;
  custom_body?: string;
}

export interface PreviewResult {
  subject?: string;
  body: string;
}

export interface AnalyticsData {
  total_sent: number;
  delivered: number;
  opened: number;
  failed: number;
  delivery_rate: number;
  open_rate: number;
  failure_rate: number;
}

export interface CommunicationFilters {
  category?: string;
  channel?: string;
  search?: string;
  client_id?: number;
  event_id?: number;
  template_name?: string;
  status?: string;
}
