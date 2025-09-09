// frontend/client-portal/src/apis/messaging.api.ts

import api from '../utils/api';
import type {
  MessageThread,
  Message,
  ThreadFilters,
  MessageFilters,
  SendMessageRequest,
  SendMessageResponse,
  AdminMessageAction,
  ThreadStats,
} from '../types/messaging.types';

export const messagingApi = {
  // Thread operations
  getThreads: async (filters?: ThreadFilters): Promise<MessageThread[]> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.assigned_admin) params.append('assigned_admin', filters.assigned_admin.toString());
    if (filters?.search) params.append('search', filters.search);
    if (filters?.event_id) params.append('event_id', filters.event_id.toString());
    
    const response = await api.get(`/messaging/threads/?${params.toString()}`);
    const data = response.data as { results?: MessageThread[] } | MessageThread[];
    return (data as { results?: MessageThread[] }).results || (data as MessageThread[]);
  },

  getThread: async (threadId: string): Promise<MessageThread> => {
    const response = await api.get<MessageThread>(`/messaging/threads/${threadId}/`);
    return response.data;
  },

  // Message operations
  getMessages: async (filters: MessageFilters): Promise<Message[]> => {
    const params = new URLSearchParams();
    params.append('thread_id', filters.thread_id);
    if (filters.before) params.append('before', filters.before);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.include_internal !== undefined) {
      params.append('include_internal', filters.include_internal.toString());
    }
    
    const response = await api.get(`/messaging/messages/?${params.toString()}`);
    const data = response.data as { results?: Message[] } | Message[];
    return (data as { results?: Message[] }).results || (data as Message[]);
  },

  sendMessage: async (request: SendMessageRequest): Promise<SendMessageResponse> => {
    const response = await api.post<SendMessageResponse>('/messaging/messages/', request);
    return response.data;
  },

  markAsRead: async (messageId: string): Promise<void> => {
    await api.post(`/messaging/messages/${messageId}/mark_read/`);
  },

  markThreadAsRead: async (threadId: string): Promise<void> => {
    await api.post(`/messaging/threads/${threadId}/mark_read/`);
  },

  // Admin actions (will return 403 for clients)
  performAdminAction: async (action: AdminMessageAction): Promise<void> => {
    await api.post(`/messaging/threads/${action.thread_id}/admin_action/`, {
      action: action.action,
      ...action.data,
    });
  },

  // Thread statistics
  getThreadStats: async (threadId: string): Promise<ThreadStats> => {
    const response = await api.get<ThreadStats>(`/messaging/threads/${threadId}/stats/`);
    return response.data;
  },

  // File upload for attachments
  uploadAttachment: async (file: File): Promise<{ id: string; url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post<{ id: string; url: string }>(
      '/messaging/attachments/',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  // Quick actions
  markThreadUrgent: async (threadId: string): Promise<void> => {
    await api.post(`/messaging/threads/${threadId}/mark_urgent/`);
  },

  requestCallback: async (threadId: string): Promise<void> => {
    await api.post(`/messaging/threads/${threadId}/request_callback/`);
  },

  resolveThread: async (threadId: string): Promise<void> => {
    await api.post(`/messaging/threads/${threadId}/resolve/`);
  },

  reopenThread: async (threadId: string): Promise<void> => {
    await api.post(`/messaging/threads/${threadId}/reopen/`);
  },

  // Typing indicators
  sendTypingIndicator: async (threadId: string, isTyping: boolean): Promise<void> => {
    await api.post(`/messaging/threads/${threadId}/typing/`, { is_typing: isTyping });
  },
};