// frontend/admin-crm/src/types/clients.types.ts

// Import Event interface from events domain to avoid duplication
import type { Event } from './events.types';

// Re-export Event for backward compatibility
export type { Event };

export interface ClientProfile {
  phone?: string;
  company?: string;
}

export interface Client {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  profile?: ClientProfile;
  date_joined: string;
  is_active: boolean;
  has_account: boolean;
  events?: Event[];
}

export interface CreateClientData {
  email: string; // Required
  first_name: string; // Required
  last_name: string; // Required
  profile?: ClientProfile;
  password?: string;
  is_active?: boolean;
}

export interface UpdateClientData {
  email?: string;
  first_name?: string;
  last_name?: string;
  profile?: ClientProfile;
  password?: string;
  is_active?: boolean;
}

export interface ClientFilters {
  search?: string;
  is_active?: boolean;
  has_account?: boolean;
}

export interface ClientInvitation {
  id: string;
  client: string;
  client_name: string;
  invited_by: string;
  is_accepted: boolean;
  expires_at: string;
  created_at: string;
}

export interface SendInvitationData {
  client_id: number;
}

export interface AcceptInvitationData {
  password: string;
  confirm_password: string;
}

export interface AcceptInvitationResponse {
  message: string;
  tokens: {
    access: string;
    refresh: string;
  };
  user: Client;
}


// Communication Records interfaces
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
  context_data: Record<string, unknown>;
  created_at: string;
}

export interface CommunicationFilters {
  template_name?: string;
  channel?: 'EMAIL' | 'SMS';
  category?: 'SYSTEM' | 'MANUAL' | 'AUTO';
  delivery_status?: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED';
  date_from?: string;
  date_to?: string;
  search?: string;
  client_id?: number;
}

// Communication Template interfaces
export interface CommunicationTemplate {
  id: number;
  name: string;
  channel: 'EMAIL' | 'SMS';
  category: 'SYSTEM' | 'MANUAL' | 'AUTO';
  subject_template?: string;
  body_template: string;
  is_system: boolean;
  variables_schema: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Send Communication interfaces
export interface SendCommunicationData {
  template_id: number;
  recipient: string;
  client_id?: number;
  context_data?: Record<string, unknown>;
}