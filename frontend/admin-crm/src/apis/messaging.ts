import api from '../utils/api';
import type { 
  MessageThread, 
  Message, 
  MessageFilters,
  CreateMessageData
} from '../types/messaging.types';

export const messagingApi = {
  // Get all message threads with optional filters
  getThreads: async (filters?: MessageFilters): Promise<MessageThread[]> => {
    const params = new URLSearchParams();
    
    if (filters?.client_id) params.append('client_id', filters.client_id.toString());
    if (filters?.event_id) params.append('event_id', filters.event_id.toString());
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);
    
    const response = await api.get(`/messaging/threads/?${params.toString()}`);
    
    // Debug logging for API response
    if (process.env.NODE_ENV === 'development') {
      console.log('Threads API response:', response.data);
    }
    
    // Handle different response formats
    let threads: unknown[] = [];
    
    if (Array.isArray(response.data)) {
      threads = response.data;
    } else if (response.data && typeof response.data === 'object' && 'results' in response.data && Array.isArray(response.data.results)) {
      threads = response.data.results;
    }
    
    // Transform threads to ensure proper structure
    return threads.map((thread) => {
      const threadData = thread && typeof thread === 'object' ? thread as Record<string, unknown> : {};
      
      // Extract client information from various possible structures
      let clientName = '';
      let clientEmail = '';
      let clientPhone = '';
      let clientId: number | undefined;
      
      // Check for client object
      if (threadData.client && typeof threadData.client === 'object') {
        const clientObj = threadData.client as Record<string, unknown>;
        
        if (process.env.NODE_ENV === 'development') {
          console.log('Client object found:', clientObj);
        }
        
        clientName = (clientObj.name as string) || 
                    `${clientObj.first_name || ''} ${clientObj.last_name || ''}`.trim() ||
                    (clientObj.email as string) || '';
        clientEmail = (clientObj.email as string) || '';
        clientPhone = (clientObj.phone as string) || '';
        clientId = (clientObj.id as number) || undefined;
      } else {
        // Fallback to direct properties
        if (process.env.NODE_ENV === 'development') {
          console.log('Using direct client properties:', {
            client_name: threadData.client_name,
            client_id: threadData.client_id,
            client_email: threadData.client_email,
            client_phone: threadData.client_phone
          });
        }
        
        clientName = (threadData.client_name as string) || '';
        clientEmail = (threadData.client_email as string) || '';
        clientPhone = (threadData.client_phone as string) || '';
        clientId = (threadData.client_id as number) || undefined;
      }
      
      // Extract event information
      let eventName = '';
      let eventId: number | undefined;
      let eventDate = '';
      
      if (threadData.event && typeof threadData.event === 'object') {
        const eventObj = threadData.event as Record<string, unknown>;
        eventName = (eventObj.name as string) || (eventObj.title as string) || '';
        eventId = (eventObj.id as number) || undefined;
        eventDate = (eventObj.date as string) || (eventObj.event_date as string) || '';
      } else {
        eventName = (threadData.event_name as string) || '';
        eventId = (threadData.event_id as number) || undefined;
        eventDate = (threadData.event_date as string) || '';
      }
      
      return {
        id: (threadData.id as string) || '',
        client_id: clientId,
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone,
        event_id: eventId,
        event_name: eventName,
        event_date: eventDate,
        priority: (threadData.priority as MessageThread['priority']) || 'normal',
        status: (threadData.status as MessageThread['status']) || 'active',
        unread_count: (threadData.unread_count as number) || 0,
        last_message_at: (threadData.last_message_at as string) || (threadData.updated_at as string),
        created_at: (threadData.created_at as string) || new Date().toISOString(),
        updated_at: (threadData.updated_at as string) || new Date().toISOString(),
      } as MessageThread;
    });
  },

  // Get specific message thread
  getThread: async (threadId: string): Promise<MessageThread> => {
    const response = await api.get(`/messaging/threads/${threadId}/`);
    
    // Debug logging for single thread API response
    if (process.env.NODE_ENV === 'development') {
      console.log('Single thread API response:', response.data);
    }
    
    const threadData = response.data && typeof response.data === 'object' ? response.data as Record<string, unknown> : {};
    
    // Extract client information from various possible structures
    let clientName = '';
    let clientEmail = '';
    let clientPhone = '';
    let clientId: number | undefined;
    
    // Check for client object
    if (threadData.client && typeof threadData.client === 'object') {
      const clientObj = threadData.client as Record<string, unknown>;
      clientName = (clientObj.name as string) || 
                  `${clientObj.first_name || ''} ${clientObj.last_name || ''}`.trim() ||
                  (clientObj.email as string) || '';
      clientEmail = (clientObj.email as string) || '';
      clientPhone = (clientObj.phone as string) || '';
      clientId = (clientObj.id as number) || undefined;
    } else {
      // Fallback to direct properties
      clientName = (threadData.client_name as string) || '';
      clientEmail = (threadData.client_email as string) || '';
      clientPhone = (threadData.client_phone as string) || '';
      clientId = (threadData.client_id as number) || undefined;
    }
    
    // Extract event information
    let eventName = '';
    let eventId: number | undefined;
    let eventDate = '';
    
    if (threadData.event && typeof threadData.event === 'object') {
      const eventObj = threadData.event as Record<string, unknown>;
      eventName = (eventObj.name as string) || (eventObj.title as string) || '';
      eventId = (eventObj.id as number) || undefined;
      eventDate = (eventObj.date as string) || (eventObj.event_date as string) || '';
    } else {
      eventName = (threadData.event_name as string) || '';
      eventId = (threadData.event_id as number) || undefined;
      eventDate = (threadData.event_date as string) || '';
    }
    
    return {
      id: (threadData.id as string) || '',
      client_id: clientId,
      client_name: clientName,
      client_email: clientEmail,
      client_phone: clientPhone,
      event_id: eventId,
      event_name: eventName,
      event_date: eventDate,
      priority: (threadData.priority as MessageThread['priority']) || 'normal',
      status: (threadData.status as MessageThread['status']) || 'active',
      unread_count: (threadData.unread_count as number) || 0,
      last_message_at: (threadData.last_message_at as string) || (threadData.updated_at as string),
      created_at: (threadData.created_at as string) || new Date().toISOString(),
      updated_at: (threadData.updated_at as string) || new Date().toISOString(),
    } as MessageThread;
  },

  // Get messages for a thread
  getThreadMessages: async (threadId: string): Promise<Message[]> => {
    const params = new URLSearchParams();
    params.append('thread_id', threadId);
    const response = await api.get(`/messaging/messages/?${params.toString()}`);
    
    // Handle different response formats and ensure required properties exist
    let messages: unknown[] = [];
    
    if (Array.isArray(response.data)) {
      messages = response.data;
    } else if (response.data && typeof response.data === 'object' && 'results' in response.data && Array.isArray(response.data.results)) {
      messages = response.data.results;
    } else if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      const dataField = response.data.data;
      messages = Array.isArray(dataField) ? dataField : [];
    }
    
    // Transform messages to ensure proper structure
    return messages.map((msg, index) => {
      const messageData = msg && typeof msg === 'object' ? msg as Record<string, unknown> : {};
      
      // Use the sender object if it exists (new API format), otherwise build from legacy fields
      let sender;
      if (messageData.sender && typeof messageData.sender === 'object') {
        const senderObj = messageData.sender as Record<string, unknown>;
        sender = {
          id: (senderObj.id as number) || 0,
          name: (senderObj.name as string) || 'Unknown',
          role: (senderObj.role as 'ADMIN' | 'CLIENT') || 'CLIENT',
          avatar: (senderObj.avatar as string) || undefined,
        };
      } else {
        // Fallback to legacy fields
        sender = {
          id: (messageData.sender_id as number) || 0,
          name: (messageData.sender_name as string) || 'Unknown',
          role: messageData.sender_type === 'admin' ? 'ADMIN' as const : 'CLIENT' as const,
          avatar: (messageData.sender_avatar as string) || undefined,
        };
      }
      
      return {
        id: (messageData.id as string) || `temp-${index}`,
        thread_id: (messageData.thread_id as string) || '',
        sender,
        content: (messageData.content as string) || '',
        message_type: (messageData.message_type as Message['message_type']) || 'text',
        is_read: Boolean(messageData.is_read),
        is_internal_note: Boolean(messageData.is_internal_note),
        read_by: Array.isArray(messageData.read_by) ? messageData.read_by as string[] : [],
        attachments: Array.isArray(messageData.attachments) ? messageData.attachments as Message['attachments'] : [],
        created_at: (messageData.created_at as string) || new Date().toISOString(),
        updated_at: (messageData.updated_at as string) || new Date().toISOString(),
        edited_at: (messageData.edited_at as string) || undefined,
        // Legacy properties for backward compatibility
        sender_id: sender.id,
        sender_name: sender.name,
        sender_type: sender.role === 'ADMIN' ? 'admin' : 'client',
      } as Message;
    });
  },

  // Send a message
  sendMessage: async (data: CreateMessageData): Promise<Message> => {
    const formData = new FormData();
    formData.append('content', data.content);
    formData.append('thread_id', data.thread_id);
    
    if (data.attachments) {
      data.attachments.forEach((file) => {
        formData.append(`attachments`, file);
      });
    }

    const response = await api.post('/messaging/messages/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    // Transform the response to ensure proper structure
    const messageData = response.data && typeof response.data === 'object' ? response.data as Record<string, unknown> : {};
    
    // Use the sender object if it exists (new API format), otherwise build from legacy fields
    let sender;
    if (messageData.sender && typeof messageData.sender === 'object') {
      const senderObj = messageData.sender as Record<string, unknown>;
      sender = {
        id: (senderObj.id as number) || 0,
        name: (senderObj.name as string) || 'Unknown',
        role: (senderObj.role as 'ADMIN' | 'CLIENT') || 'CLIENT',
        avatar: (senderObj.avatar as string) || undefined,
      };
    } else {
      // Fallback to legacy fields
      sender = {
        id: (messageData.sender_id as number) || 0,
        name: (messageData.sender_name as string) || 'Unknown',
        role: messageData.sender_type === 'admin' ? 'ADMIN' as const : 'CLIENT' as const,
        avatar: (messageData.sender_avatar as string) || undefined,
      };
    }
    
    return {
      id: (messageData.id as string) || '',
      thread_id: (messageData.thread_id as string) || '',
      sender,
      content: (messageData.content as string) || '',
      message_type: (messageData.message_type as Message['message_type']) || 'text',
      is_read: Boolean(messageData.is_read),
      is_internal_note: Boolean(messageData.is_internal_note),
      read_by: Array.isArray(messageData.read_by) ? messageData.read_by as string[] : [],
      attachments: Array.isArray(messageData.attachments) ? messageData.attachments as Message['attachments'] : [],
      created_at: (messageData.created_at as string) || new Date().toISOString(),
      updated_at: (messageData.updated_at as string) || new Date().toISOString(),
      edited_at: (messageData.edited_at as string) || undefined,
      // Legacy properties for backward compatibility
      sender_id: sender.id,
      sender_name: sender.name,
      sender_type: sender.role === 'ADMIN' ? 'admin' : 'client',
    } as Message;
  },

  // Admin actions
  markUrgent: async (threadId: string): Promise<void> => {
    await api.post(`/messaging/threads/${threadId}/mark_urgent/`);
  },

  requestCallback: async (threadId: string): Promise<void> => {
    await api.post(`/messaging/threads/${threadId}/request_callback/`);
  },

  markRead: async (threadId: string): Promise<void> => {
    await api.post(`/messaging/threads/${threadId}/mark_read/`);
  },

  resolveThread: async (threadId: string): Promise<void> => {
    await api.post(`/messaging/threads/${threadId}/resolve/`);
  },

  reopenThread: async (threadId: string): Promise<void> => {
    await api.post(`/messaging/threads/${threadId}/reopen/`);
  },

  // Get unread message count for admin (computed from threads)
  getUnreadCount: async (): Promise<{ count: number }> => {
    const threads = await messagingApi.getThreads();
    const unreadCount = threads.reduce((count, thread) => count + (thread.unread_count || 0), 0);
    return { count: unreadCount };
  },

  // Get message statistics (computed from threads)
  getMessageStats: async (): Promise<{
    total_threads: number;
    unread_count: number;
    urgent_count: number;
    resolved_count: number;
  }> => {
    const threads = await messagingApi.getThreads();
    const stats = {
      total_threads: threads.length,
      unread_count: threads.reduce((count, thread) => count + (thread.unread_count || 0), 0),
      urgent_count: threads.filter(thread => thread.priority === 'urgent').length,
      resolved_count: threads.filter(thread => thread.status === 'resolved').length,
    };
    return stats;
  },
};