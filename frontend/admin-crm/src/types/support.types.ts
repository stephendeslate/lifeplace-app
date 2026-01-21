// frontend/admin-crm/src/types/support.types.ts

export type SupportCategory = 'billing' | 'event' | 'technical' | 'general';

export type SupportStatus = 'active' | 'waiting' | 'resolved' | 'archived';

export type SupportPriority = 'urgent' | 'high' | 'normal' | 'low';

export interface SupportMessage {
  id: string;
  sender: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    display_name: string;
    role: string;
  };
  content: string;
  message_type: string;
  is_internal_note: boolean;
  attachments: {
    id: string;
    filename: string;
    file_url: string;
    file_size: number;
  }[];
  created_at: string;
}

export interface SupportInquiry {
  id: string;
  subject: string;
  category: SupportCategory;
  category_display: string;
  status: SupportStatus;
  status_display: string;
  priority: SupportPriority;
  client: number;
  client_name: string;
  client_email: string;
  assigned_admin: number | null;
  assigned_admin_name: string | null;
  event: number | null;
  event_name: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
}

export interface SupportInquiryDetail extends SupportInquiry {
  messages: SupportMessage[];
}

export interface SupportInquiryUpdate {
  status?: SupportStatus;
  priority?: SupportPriority;
  assigned_admin?: number | null;
  internal_note?: string;
}

export interface SupportReply {
  content: string;
  is_internal_note?: boolean;
}

export interface SupportStats {
  total: number;
  open: number;
  in_progress: number;
  resolved_today: number;
  unassigned: number;
  by_category: Record<SupportCategory, number>;
  by_priority: Record<SupportPriority, number>;
}

export interface SupportFilters {
  status?: SupportStatus;
  category?: SupportCategory;
  assigned_admin?: string;
  priority?: SupportPriority;
  search?: string;
}
