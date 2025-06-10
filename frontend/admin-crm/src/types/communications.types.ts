// frontend/admin-crm/src/types/communications.types.ts

export interface CommunicationTemplate {
  id: number;
  name: string;
  channel: 'EMAIL' | 'SMS';
  category: 'SYSTEM' | 'MANUAL' | 'AUTO';
  subject_template?: string;
  body_template: string;
  is_system: boolean;
  variables_schema: Record<string, any>;
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
  external_message_id?: string;
  delivery_status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED';
  sent_at?: string;
  delivered_at?: string;
  opened_at?: string;
  is_opened: boolean;
  context_data: Record<string, any>;
  created_at: string;
}

export interface CreateTemplateData {
  name: string;
  channel: 'EMAIL' | 'SMS';
  category: 'SYSTEM' | 'MANUAL' | 'AUTO';
  subject_template?: string;
  body_template: string;
  variables_schema?: Record<string, any>;
}

export interface UpdateTemplateData extends Partial<CreateTemplateData> {}

export interface SendCommunicationData {
  template_id: number;
  recipient: string;
  client_id?: number;
  context_data?: Record<string, any>;
}

export interface BulkSendData {
  template_id: number;
  recipients: Array<{
    recipient: string;
    client_id?: number;
    context_data?: Record<string, any>;
  }>;
}

export interface PreviewData {
  template_id: number;
  context_data?: Record<string, any>;
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

export interface VariableSchemas {
  client_variables: Record<string, string>;
  system_variables: Record<string, string>;
  admin_invitation_variables: Record<string, string>;
}

export interface CommunicationFilters {
  category?: string;
  channel?: string;
  search?: string;
  client_id?: number;
  template_name?: string;
  status?: string;
}