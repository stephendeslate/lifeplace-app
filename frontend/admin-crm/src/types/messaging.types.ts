// Frontend admin-crm messaging types

export interface MessageThread {
  id: string;
  client_id?: number;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  event_id?: number;
  event_name?: string;
  event_date?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'active' | 'waiting' | 'resolved';
  unread_count: number;
  last_message?: Message;
  last_message_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  thread_id: string;
  sender: {
    id: number;
    name: string;
    role: 'CLIENT' | 'ADMIN';
    avatar?: string;
  };
  content: string;
  message_type: 'text' | 'system' | 'file' | 'event_update';
  is_read: boolean;
  is_internal_note?: boolean;
  read_by?: string[];
  edited_at?: string;
  attachments?: MessageAttachment[];
  created_at: string;
  updated_at: string;
  // Legacy properties for backward compatibility
  sender_id?: number;
  sender_name?: string;
  sender_type?: 'admin' | 'client';
}

export interface MessageAttachment {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  file_url: string;
}

export interface MessageFilters {
  client_id?: number;
  event_id?: number;
  priority?: string;
  status?: string;
  search?: string;
}

export interface CreateMessageData {
  thread_id: string;
  content: string;
  attachments?: File[];
}

export interface AdminActionData {
  action: 'mark_urgent' | 'request_callback' | 'mark_read' | 'resolve' | 'reopen';
  thread_id: string;
}