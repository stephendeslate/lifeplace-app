// frontend/client-portal/src/types/messaging.types.ts

export interface MessageThread {
  id: string;
  event_id: number;
  event_name: string;
  event_date: string;
  client_id: number;
  client_name: string;
  assigned_admin?: {
    id: number;
    name: string;
    avatar?: string;
  };
  priority: 'urgent' | 'high' | 'normal' | 'low';
  status: 'active' | 'waiting' | 'resolved';
  unread_count: number;
  last_message?: {
    content: string;
    sender_name: string;
    sent_at: string;
  };
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
  is_internal_note?: boolean; // Admin-only visibility
  attachments?: MessageAttachment[];
  read_by: number[];
  created_at: string;
  edited_at?: string;
}

export interface MessageAttachment {
  id: string;
  filename: string;
  file_url: string;
  file_size: number;
  file_type: string;
  uploaded_at: string;
}

export interface MessageComposition {
  thread_id: string;
  content: string;
  attachments?: File[];
  is_internal_note?: boolean;
}

export interface SendMessageRequest {
  thread_id: string;
  content: string;
  message_type?: 'text' | 'file';
  attachments?: string[]; // File IDs after upload
  is_internal_note?: boolean;
}

export interface SendMessageResponse {
  success: boolean;
  message?: Message;
  error?: string;
}

export interface ThreadFilters {
  status?: 'active' | 'waiting' | 'resolved';
  priority?: 'urgent' | 'high' | 'normal' | 'low';
  assigned_admin?: number;
  search?: string;
  event_id?: number;
}

export interface MessageFilters {
  thread_id: string;
  before?: string; // For pagination
  limit?: number;
  include_internal?: boolean;
}

export interface TypingIndicator {
  thread_id: string;
  user_id: number;
  user_name: string;
  is_typing: boolean;
}

export interface MessageReadReceipt {
  message_id: string;
  user_id: number;
  read_at: string;
}

// WebSocket event types
export interface WSMessage {
  type: 'new_message' | 'message_read' | 'typing' | 'thread_updated';
  payload: Message | MessageReadReceipt | TypingIndicator | MessageThread;
}

export interface ThreadStats {
  total_messages: number;
  response_time_avg: number; // in minutes
  resolution_time_avg: number; // in hours
  satisfaction_rating?: number;
}

// Quick actions for clients
export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: 'mark_urgent' | 'request_callback' | 'attach_file' | 'resolve';
  enabled: boolean;
}

// Admin-specific features
export interface CannedResponse {
  id: string;
  title: string;
  content: string;
  category: string;
  usage_count: number;
}

export interface AdminMessageAction {
  action: 'assign' | 'change_priority' | 'add_internal_note' | 'resolve';
  thread_id: string;
  data?: {
    admin_id?: number;
    priority?: 'urgent' | 'high' | 'normal' | 'low';
    note?: string;
  };
}