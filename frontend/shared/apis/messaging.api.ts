// Unified messaging API client for both applications
import type {
  MessageThread,
  Message,
  ThreadFilters,
  MessageFilters,
  SendMessageRequest,
  AdminMessageAction,
  CannedResponse,
  ThreadStats,
  PaginatedThreadsResponse,
  PaginatedMessagesResponse,
} from '../types/messaging.types';

// Re-export the paginated response types for consistency
export interface ThreadResponse extends PaginatedThreadsResponse {}
export interface MessageResponse extends PaginatedMessagesResponse {}

export interface UnreadCountsResponse {
  total_unread: number;
  by_priority: {
    urgent: number;
    high: number;
    normal: number;
    low: number;
  };
  by_status: {
    active: number;
    waiting: number;
    resolved: number;
  };
}

// This will be injected by the specific application (admin-crm or client-portal)
// Each app will provide its own configured axios instance
let apiClient: any;

export const setApiClient = (client: any) => {
  apiClient = client;
};

// File upload progress callback type
export type UploadProgressCallback = (progress: number) => void;

export const messagingApi = {
  // Thread operations
  getThreads: async (filters?: ThreadFilters & { page?: number }): Promise<ThreadResponse> => {
    const params = new URLSearchParams();
    
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.assigned_admin) params.append('assigned_admin', filters.assigned_admin.toString());
    if (filters?.search) params.append('search', filters.search);
    if (filters?.event_id) params.append('event_id', filters.event_id.toString());
    
    const response = await apiClient.get(`/messaging/threads/?${params}`);
    return response.data;
  },

  getThread: async (id: string): Promise<MessageThread> => {
    const response = await apiClient.get(`/messaging/threads/${id}/`);
    return response.data;
  },

  // Message operations
  getMessages: async (
    threadId: string,
    filters?: MessageFilters & { before?: string; limit?: number }
  ): Promise<MessageResponse> => {
    const params = new URLSearchParams();
    
    if (filters?.before) params.append('before', filters.before);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.include_internal !== undefined) {
      params.append('include_internal', filters.include_internal.toString());
    }
    
    const response = await apiClient.get(`/messaging/threads/${threadId}/messages/?${params}`);
    return response.data;
  },

  sendMessage: async (messageData: SendMessageRequest): Promise<Message> => {
    const response = await apiClient.post('/messaging/messages/', messageData);
    return response.data;
  },

  // Mark messages as read
  markAsRead: async (messageIds: string[]): Promise<void> => {
    await apiClient.post('/messaging/messages/mark-read/', { message_ids: messageIds });
  },

  // Unread counts
  getUnreadCounts: async (): Promise<UnreadCountsResponse> => {
    const response = await apiClient.get('/messaging/unread-counts/');
    return response.data;
  },

  // Thread stats
  getThreadStats: async (threadId: string): Promise<ThreadStats> => {
    const response = await apiClient.get(`/messaging/threads/${threadId}/stats/`);
    return response.data;
  },

  // General thread statistics (admin only)
  getGeneralStats: async (): Promise<any> => {
    const response = await apiClient.get('/messaging/threads/stats/');
    return response.data;
  },

  // File upload
  uploadFile: async (file: File, threadId: string): Promise<{ id: string; file_url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('thread_id', threadId);
    
    const response = await apiClient.post('/messaging/attachments/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Admin-specific operations
  admin: {
    assignThread: async (threadId: string, adminId: number): Promise<MessageThread> => {
      const response = await apiClient.patch(`/messaging/threads/${threadId}/`, {
        assigned_admin: adminId,
      });
      return response.data;
    },

    setThreadPriority: async (threadId: string, priority: MessageThread['priority']): Promise<MessageThread> => {
      const response = await apiClient.patch(`/messaging/threads/${threadId}/`, {
        priority,
      });
      return response.data;
    },

    resolveThread: async (threadId: string): Promise<MessageThread> => {
      const response = await apiClient.patch(`/messaging/threads/${threadId}/`, {
        status: 'resolved',
      });
      return response.data;
    },

    performBulkAction: async (action: AdminMessageAction): Promise<void> => {
      await apiClient.post('/messaging/bulk-actions/', action);
    },

    getCannedResponses: async (): Promise<CannedResponse[]> => {
      const response = await apiClient.get('/messaging/canned-responses/');
      return response.data.results || response.data;
    },

    getAnalytics: async (filters?: { 
      start_date?: string; 
      end_date?: string; 
      admin_id?: number 
    }) => {
      const params = new URLSearchParams();
      
      if (filters?.start_date) params.append('start_date', filters.start_date);
      if (filters?.end_date) params.append('end_date', filters.end_date);
      if (filters?.admin_id) params.append('admin_id', filters.admin_id.toString());
      
      const response = await apiClient.get(`/messaging/analytics/?${params}`);
      return response.data;
    },
  },

  // Typing indicators (WebSocket fallback)
  sendTypingIndicator: async (threadId: string, isTyping: boolean): Promise<void> => {
    await apiClient.post('/messaging/typing/', {
      thread_id: threadId,
      is_typing: isTyping,
    });
  },

  // Additional essential methods for compatibility
  getMessage: async (messageId: string): Promise<Message> => {
    const response = await apiClient.get(`/messaging/messages/${messageId}/`);
    return response.data;
  },

  searchMessages: async (query: string, filters: any = {}): Promise<any> => {
    const params = new URLSearchParams({ search: query });
    const response = await apiClient.get(`/messaging/messages/?${params}`);
    return response.data;
  },

  searchThreads: async (query: string, filters: any = {}): Promise<any> => {
    return messagingApi.getThreads({ ...filters, search: query });
  },

  createThread: async (data: Partial<MessageThread>): Promise<MessageThread> => {
    const response = await apiClient.post('/messaging/threads/', data);
    return response.data;
  },

  updateThread: async (threadId: string, data: any): Promise<MessageThread> => {
    const response = await apiClient.patch(`/messaging/threads/${threadId}/`, data);
    return response.data;
  },

  updateMessage: async (messageId: string, data: any): Promise<Message> => {
    const response = await apiClient.patch(`/messaging/messages/${messageId}/`, data);
    return response.data;
  },

  deleteMessage: async (messageId: string): Promise<void> => {
    await apiClient.delete(`/messaging/messages/${messageId}/`);
  },

  markMessageRead: async (messageId: string): Promise<void> => {
    await apiClient.post(`/messaging/messages/${messageId}/mark_read/`);
  },

  markThreadRead: async (threadId: string): Promise<void> => {
    await apiClient.post('/messaging/messages/mark_thread_read/', { thread_id: threadId });
  },

  performAdminAction: async (action: any): Promise<any> => {
    // This is a placeholder - implement based on the specific admin actions needed
    throw new Error('performAdminAction not yet implemented - please implement specific admin actions');
  },
};