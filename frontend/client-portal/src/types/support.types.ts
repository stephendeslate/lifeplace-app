// frontend/client-portal/src/types/support.types.ts

export type SupportCategory = 'billing' | 'event' | 'technical' | 'general';

export type SupportStatus = 'active' | 'waiting' | 'resolved' | 'archived';

export interface SupportSettings {
  support_email: string;
  support_phone: string;
  support_hours: Record<string, string>;
  company_name: string;
}

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
  event: number | null;
  event_name: string | null;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
}

export interface SupportInquiryDetail extends SupportInquiry {
  messages: SupportMessage[];
}

export interface SupportInquiryCreate {
  subject: string;
  category: SupportCategory;
  event?: number;
  initial_message: string;
}

export interface SupportReply {
  content: string;
}

export interface SupportFilters {
  status?: SupportStatus;
  category?: SupportCategory;
}
