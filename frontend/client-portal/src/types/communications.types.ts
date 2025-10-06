// frontend/client-portal/src/types/communications.types.ts

export interface CommunicationTemplate {
  id: number;
  name: string;
  channel: 'EMAIL' | 'SMS';
  category: 'SYSTEM' | 'MANUAL' | 'AUTO';
  subject_template?: string;
  body_template: string;
  is_system: boolean;
  variables_schema: Record<string, { type: string; required: boolean; description?: string; }>;
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
  context_data: Record<string, string | number | boolean>;
  created_at: string;
}

export interface CommunicationFilters {
  search?: string;
  template_name?: string;
  channel?: 'EMAIL' | 'SMS';
  category?: 'SYSTEM' | 'MANUAL' | 'AUTO';
  delivery_status?: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED';
  client_id?: number;
  status?: string;
}

export interface SendCommunicationData {
  template_id: number;
  recipient: string;
  client_id?: number;
  context_data?: Record<string, string | number | boolean>;
}

export interface BulkSendData {
  template_id: number;
  recipients: Array<{
    recipient: string;
    client_id?: number;
    context_data?: Record<string, string | number | boolean>;
  }>;
}

export interface PreviewCommunicationData {
  template_id: number;
  context_data?: Record<string, string | number | boolean>;
}

export interface PreviewResponse {
  subject?: string;
  body: string;
}

export interface CommunicationAnalytics {
  total_sent: number;
  delivered: number;
  opened: number;
  failed: number;
  delivery_rate: number;
  open_rate: number;
  failure_rate: number;
}

// Message composition types
export interface MessageComposition {
  template_id?: number;
  template?: CommunicationTemplate;
  recipient: string;
  client_id?: number;
  channel: 'EMAIL' | 'SMS';
  subject?: string;
  body: string;
  context_data?: Record<string, string | number | boolean>;
  custom_subject?: string;
  custom_body?: string;
  use_template?: boolean;
}

export interface MessageDraft extends MessageComposition {
  id?: string;
  created_at?: string;
  updated_at?: string;
  is_saved?: boolean;
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  required: boolean;
  description?: string;
  default_value?: string | number | boolean;
  example_value?: string | number | boolean;
}

export interface TemplatePreviewData {
  subject?: string;
  body: string;
  variables_used: string[];
  missing_variables: string[];
  preview_context?: Record<string, unknown>;
}

export interface MessageValidation {
  is_valid: boolean;
  errors: Array<{
    field: string;
    message: string;
    code?: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
    code?: string;
  }>;
  character_count?: {
    subject?: number;
    body: number;
    limit?: number;
    remaining?: number;
  };
}

export interface SendMessageRequest {
  template_id?: number;
  recipient: string;
  client_id?: number;
  context_data?: Record<string, string | number | boolean>;
  custom_subject?: string;
  custom_body?: string;
  use_async?: boolean;
}

export interface SendMessageResponse {
  success: boolean;
  record?: CommunicationRecord;
  message?: string;
  errors?: string[];
  async?: boolean;
}

export interface RecipientSuggestion {
  id: string;
  name: string;
  email: string;
  type: 'client' | 'contact' | 'user';
  avatar?: string;
  recent_interaction?: boolean;
}

export interface MessageThread {
  id: string;
  participants: Array<{
    user_id: string;
    name: string;
    email: string;
    role: string;
  }>;
  subject: string;
  last_message_at: string;
  message_count: number;
  unread_count: number;
  messages: CommunicationRecord[];
}

// Enhanced communication filters for composition
export interface CompositionFilters extends CommunicationFilters {
  recipient_type?: 'client' | 'contact' | 'user';
  has_recent_activity?: boolean;
  template_category?: 'SYSTEM' | 'MANUAL' | 'AUTO';
}