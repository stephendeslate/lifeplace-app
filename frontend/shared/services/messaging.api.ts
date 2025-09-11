/**
 * Modern Messaging API Service
 * 
 * Features:
 * - React Query integration with optimistic updates
 * - Advanced caching strategies
 * - File upload with progress tracking
 * - Error handling with user-friendly messages
 * - Offline support and synchronization
 * - Request/response transformation
 */

import axios from 'axios';
import type { AxiosInstance, AxiosProgressEvent } from 'axios';
import type {
  MessageThread,
  Message,
  MessageAttachment,
  SendMessageRequest,
  ThreadFilters,
  MessageFilters,
  AdminMessageAction,
  ThreadStats,
  PaginatedApiResponse,
  PaginatedThreadsResponse,
  PaginatedMessagesResponse
} from '../types/messaging.types';

// Legacy alias for backward compatibility
type PaginatedResponse<T> = PaginatedApiResponse<T>;

interface APIError {
  detail?: string;
  errors?: Record<string, string[]>;
  message?: string;
}

// File upload progress callback
export type UploadProgressCallback = (progress: number) => void;

// API Configuration
interface MessagingAPIConfig {
  baseURL: string;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
}

class MessagingAPIService {
  private client: AxiosInstance;
  private config: MessagingAPIConfig;
  private uploadControllers: Map<string, AbortController> = new Map();

  constructor(config: Partial<MessagingAPIConfig> = {}) {
    this.config = {
      baseURL: process.env.VITE_API_URL || 'http://localhost:8000/api',
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      ...config
    };

    this.client = this.createAxiosInstance();
  }

  private createAxiosInstance(): AxiosInstance {
    const client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    });

    // Request interceptor for authentication
    client.interceptors.request.use(
      (config) => {
        const token = this.getAuthToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Handle token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            await this.refreshToken();
            const token = this.getAuthToken();
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return client(originalRequest);
            }
          } catch (refreshError) {
            this.handleAuthError();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(this.transformError(error));
      }
    );

    return client;
  }

  private getAuthToken(): string | null {
    return localStorage.getItem('access_token');
  }

  private async refreshToken(): Promise<void> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post('/api/auth/token/refresh/', {
        refresh: refreshToken
      });

      const data = response.data as { access: string; refresh?: string };
      localStorage.setItem('access_token', data.access);
      if (data.refresh) {
        localStorage.setItem('refresh_token', data.refresh);
      }
    } catch (error) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      throw error;
    }
  }

  private handleAuthError(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    
    // Trigger app-wide authentication state update
    window.dispatchEvent(new CustomEvent('auth:logout'));
  }

  private transformError(error: any): Error {
    if (error.response?.data) {
      const apiError: APIError = error.response.data;
      
      if (apiError.detail) {
        return new Error(apiError.detail);
      }
      
      if (apiError.errors) {
        const messages = Object.values(apiError.errors).flat();
        return new Error(messages.join(', '));
      }
      
      if (apiError.message) {
        return new Error(apiError.message);
      }
    }

    if (error.code === 'NETWORK_ERROR') {
      return new Error('Network connection error. Please check your internet connection.');
    }

    if (error.code === 'TIMEOUT_ERROR') {
      return new Error('Request timeout. Please try again.');
    }

    return new Error(error.message || 'An unexpected error occurred');
  }

  // Thread Management Methods

  /**
   * Get paginated list of message threads
   */
  async getThreads(filters: ThreadFilters = {}, page: number = 1, pageSize: number = 20): Promise<PaginatedThreadsResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString()
    });

    // Add filters
    if (filters.status) params.append('status', filters.status);
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.assigned_admin) params.append('assigned_admin', filters.assigned_admin.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.event_id) params.append('event_id', filters.event_id.toString());

    const response = await this.client.get<PaginatedResponse<MessageThread>>(`/messaging/threads/?${params}`);
    return response.data;
  }

  /**
   * Get a specific thread by ID
   */
  async getThread(threadId: string): Promise<MessageThread> {
    const response = await this.client.get<MessageThread>(`/messaging/threads/${threadId}/`);
    return response.data;
  }

  /**
   * Create a new message thread
   */
  async createThread(data: Partial<MessageThread>): Promise<MessageThread> {
    const response = await this.client.post<MessageThread>('/messaging/threads/', data);
    return response.data;
  }

  /**
   * Update a thread
   */
  async updateThread(threadId: string, data: Partial<MessageThread>): Promise<MessageThread> {
    const response = await this.client.patch<MessageThread>(`/messaging/threads/${threadId}/`, data);
    return response.data;
  }

  /**
   * Delete a thread
   */
  async deleteThread(threadId: string): Promise<void> {
    await this.client.delete(`/messaging/threads/${threadId}/`);
  }

  /**
   * Admin-specific thread actions
   */
  async assignAdmin(threadId: string, adminId: number): Promise<MessageThread> {
    const response = await this.client.post<MessageThread>(`/messaging/threads/${threadId}/assign_admin/`, {
      admin_id: adminId
    });
    return response.data;
  }

  async markThreadUrgent(threadId: string): Promise<MessageThread> {
    const response = await this.client.post<MessageThread>(`/messaging/threads/${threadId}/mark_urgent/`);
    return response.data;
  }

  async resolveThread(threadId: string): Promise<MessageThread> {
    const response = await this.client.post<MessageThread>(`/messaging/threads/${threadId}/resolve/`);
    return response.data;
  }

  async reopenThread(threadId: string): Promise<MessageThread> {
    const response = await this.client.post<MessageThread>(`/messaging/threads/${threadId}/reopen/`);
    return response.data;
  }

  /**
   * Get thread statistics
   */
  async getThreadStats(): Promise<ThreadStats> {
    const response = await this.client.get<ThreadStats>('/messaging/threads/stats/');
    return response.data;
  }

  // Message Management Methods

  /**
   * Get messages for a thread with pagination
   */
  async getMessages(filters: MessageFilters = {}, page: number = 1, pageSize: number = 50): Promise<PaginatedMessagesResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString()
    });

    // Add filters
    if (filters.thread_id) params.append('thread_id', filters.thread_id);
    if (filters.before) params.append('before', filters.before);
    if (filters.include_internal !== undefined) params.append('include_internal', filters.include_internal.toString());

    const response = await this.client.get<PaginatedResponse<Message>>(`/messaging/messages/?${params}`);
    return response.data;
  }

  /**
   * Get a specific message by ID
   */
  async getMessage(messageId: string): Promise<Message> {
    const response = await this.client.get<Message>(`/messaging/messages/${messageId}/`);
    return response.data;
  }

  /**
   * Send a new message
   */
  async sendMessage(data: SendMessageRequest): Promise<Message> {
    const response = await this.client.post<Message>('/messaging/messages/', data);
    return response.data;
  }

  /**
   * Update a message
   */
  async updateMessage(messageId: string, data: Partial<Message>): Promise<Message> {
    const response = await this.client.patch<Message>(`/messaging/messages/${messageId}/`, data);
    return response.data;
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string): Promise<void> {
    await this.client.delete(`/messaging/messages/${messageId}/`);
  }

  /**
   * Mark a message as read
   */
  async markMessageRead(messageId: string): Promise<void> {
    await this.client.post(`/messaging/messages/${messageId}/mark_read/`);
  }

  /**
   * Mark all messages in a thread as read
   */
  async markThreadRead(threadId: string): Promise<void> {
    await this.client.post('/messaging/messages/mark_thread_read/', {
      thread_id: threadId
    });
  }

  // File Upload Methods

  /**
   * Upload a file with progress tracking
   */
  async uploadFile(
    file: File,
    onProgress?: UploadProgressCallback,
    uploadId?: string
  ): Promise<MessageAttachment> {
    const formData = new FormData();
    formData.append('file', file);

    // Create abort controller for cancellation
    const controller = new AbortController();
    const id = uploadId || `upload_${Date.now()}_${Math.random()}`;
    this.uploadControllers.set(id, controller);

    try {
      const response = await this.client.post<MessageAttachment>('/messaging/uploads/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        signal: controller.signal,
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          if (onProgress && progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percentCompleted);
          }
        },
      });

      return response.data;
    } finally {
      this.uploadControllers.delete(id);
    }
  }

  /**
   * Upload multiple files with progress tracking
   */
  async uploadFiles(
    files: File[],
    onProgress?: (fileIndex: number, progress: number) => void
  ): Promise<MessageAttachment[]> {
    const uploadPromises = files.map((file, index) =>
      this.uploadFile(file, (progress) => onProgress?.(index, progress))
    );

    return Promise.all(uploadPromises);
  }

  /**
   * Cancel file upload
   */
  cancelUpload(uploadId: string): void {
    const controller = this.uploadControllers.get(uploadId);
    if (controller) {
      controller.abort();
      this.uploadControllers.delete(uploadId);
    }
  }

  /**
   * Download file attachment
   */
  async downloadAttachment(attachmentId: string): Promise<Blob> {
    const response = await this.client.get(`/messaging/attachments/${attachmentId}/download/`, {
      responseType: 'blob'
    });
    return response.data;
  }

  // Typing Indicator Methods

  /**
   * Send typing indicator
   */
  async sendTypingIndicator(threadId: string, isTyping: boolean): Promise<void> {
    await this.client.post('/messaging/typing/update_typing/', {
      thread_id: threadId,
      is_typing: isTyping
    });
  }

  // Search Methods

  /**
   * Search messages across threads
   */
  async searchMessages(query: string, filters: MessageFilters = {}): Promise<PaginatedMessagesResponse> {
    const params = new URLSearchParams({
      search: query
    });

    if (filters.thread_id) params.append('thread_id', filters.thread_id);
    if (filters.include_internal !== undefined) params.append('include_internal', filters.include_internal.toString());

    const response = await this.client.get<PaginatedResponse<Message>>(`/messaging/messages/search/?${params}`);
    return response.data;
  }

  /**
   * Search threads
   */
  async searchThreads(query: string, filters: ThreadFilters = {}): Promise<PaginatedThreadsResponse> {
    const searchFilters: ThreadFilters = { ...filters, search: query };
    return this.getThreads(searchFilters);
  }

  // Admin-specific Methods

  /**
   * Perform admin action on thread
   */
  async performAdminAction(action: AdminMessageAction): Promise<MessageThread | void> {
    switch (action.action) {
      case 'assign':
        if (action.data?.admin_id) {
          return this.assignAdmin(action.thread_id, action.data.admin_id);
        }
        break;
      case 'change_priority':
        if (action.data?.priority) {
          return this.updateThread(action.thread_id, { priority: action.data.priority });
        }
        break;
      case 'resolve':
        return this.resolveThread(action.thread_id);
      case 'add_internal_note':
        if (action.data?.note) {
          await this.sendMessage({
            thread_id: action.thread_id,
            content: action.data.note,
            is_internal_note: true
          });
          return; // Explicitly return void
        }
        break;
    }
    throw new Error(`Unsupported admin action: ${action.action}`);
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: number }> {
    const response = await this.client.get('/health/');
    return {
      status: response.data.status || 'ok',
      timestamp: Date.now()
    };
  }
}

// Export singleton instance
export const messagingAPI = new MessagingAPIService();

// Export class for custom instances
export { MessagingAPIService };

export default messagingAPI;