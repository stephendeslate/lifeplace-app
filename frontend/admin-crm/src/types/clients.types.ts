// frontend/admin-crm/src/types/clients.types.ts

import type { Event } from './events.types';
import type { AcceptInvitationResponse } from './auth.types';

export type { AcceptInvitationResponse };

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
