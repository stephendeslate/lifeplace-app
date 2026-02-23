// ============================================================================
// Messaging API Layer
// ============================================================================
// Comprehensive API functions for all messaging domain endpoints
// using Axios with proper TypeScript support and error handling.

import axios from 'axios';
import type {
  // Core models
  MessageThreadDetail,
  Message,
  MessagingStats,

  // Request types
  CreateThreadRequest,
  UpdateThreadRequest,
  CreateMessageRequest,
  AssignThreadRequest,
  BulkAssignThreadsRequest,
  BulkUpdateThreadStatusRequest,
  BulkMarkAsReadRequest,

  // Response types
  ThreadListResponse,
  MessageListResponse,
  MarkAsReadResponse,
  BulkMarkAsReadResponse,
  BulkAssignResponse,
  BulkStatusUpdateResponse,

  // Filter types
  ThreadFilters,
  MessageFilters,
} from '../types/messaging';

// ============================================================================
// API Configuration
// ============================================================================

const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:8000';
const MESSAGING_BASE_URL = `${API_BASE_URL}/messaging`;

// Create axios instance with default config
const messagingApi = axios.create({
  baseURL: MESSAGING_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token interceptor
messagingApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
messagingApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle token expiration
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

// ============================================================================
// Helper Functions
// ============================================================================

const buildQueryParams = (params: Record<string, unknown>): string => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
};

const createFormData = (data: Record<string, unknown>, files?: File[]): FormData => {
  const formData = new FormData();

  // Add regular fields
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });

  // Add files
  if (files && files.length > 0) {
    files.forEach((file) => {
      formData.append('attachment_files', file);
    });
  }

  return formData;
};

// ============================================================================
// Thread API Functions
// ============================================================================

export const threadsApi = {
  /**
   * Get list of message threads with filtering and pagination
   */
  async getThreads(filters: ThreadFilters = {}): Promise<ThreadListResponse> {
    const queryParams = buildQueryParams(filters as Record<string, unknown>);
    const response = await messagingApi.get<ThreadListResponse>(`/threads/${queryParams}`);
    return response.data;
  },

  /**
   * Get a specific thread with all messages
   */
  async getThread(threadId: string): Promise<MessageThreadDetail> {
    const response = await messagingApi.get<MessageThreadDetail>(`/threads/${threadId}/`);
    return response.data;
  },

  /**
   * Create a new message thread
   */
  async createThread(data: CreateThreadRequest): Promise<MessageThreadDetail> {
    const response = await messagingApi.post<MessageThreadDetail>('/threads/', data);
    return response.data;
  },

  /**
   * Update an existing thread (admin only)
   */
  async updateThread(threadId: string, data: UpdateThreadRequest): Promise<MessageThreadDetail> {
    const response = await messagingApi.patch<MessageThreadDetail>(`/threads/${threadId}/`, data);
    return response.data;
  },

  /**
   * Delete a thread (admin only)
   */
  async deleteThread(threadId: string): Promise<void> {
    await messagingApi.delete(`/threads/${threadId}/`);
  },

  /**
   * Get messages for a specific thread with pagination
   */
  async getThreadMessages(threadId: string, filters: MessageFilters = {}): Promise<Message[]> {
    const queryParams = buildQueryParams(filters as Record<string, unknown>);
    const response = await messagingApi.get<Message[]>(
      `/threads/${threadId}/messages/${queryParams}`,
    );
    return response.data;
  },

  /**
   * Mark all messages in a thread as read
   */
  async markThreadAsRead(threadId: string): Promise<MarkAsReadResponse> {
    const response = await messagingApi.post<MarkAsReadResponse>(
      `/threads/${threadId}/mark_as_read/`,
    );
    return response.data;
  },

  /**
   * Assign a thread to an admin user
   */
  async assignThread(threadId: string, data: AssignThreadRequest): Promise<MessageThreadDetail> {
    const response = await messagingApi.patch<MessageThreadDetail>(
      `/threads/${threadId}/assign/`,
      data,
    );
    return response.data;
  },
};

// ============================================================================
// Message API Functions
// ============================================================================

export const messagesApi = {
  /**
   * Get list of messages with filtering
   */
  async getMessages(filters: MessageFilters = {}): Promise<MessageListResponse> {
    const queryParams = buildQueryParams(filters as Record<string, unknown>);
    const response = await messagingApi.get<MessageListResponse>(`/messages/${queryParams}`);
    return response.data;
  },

  /**
   * Get a specific message
   */
  async getMessage(messageId: string): Promise<Message> {
    const response = await messagingApi.get<Message>(`/messages/${messageId}/`);
    return response.data;
  },

  /**
   * Send a new message
   */
  async sendMessage(data: CreateMessageRequest): Promise<Message> {
    const { attachment_files, ...messageData } = data;

    if (attachment_files && attachment_files.length > 0) {
      // Use FormData for file uploads
      const formData = createFormData(messageData, attachment_files);
      const response = await messagingApi.post<Message>('/messages/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } else {
      // Regular JSON request
      const response = await messagingApi.post<Message>('/messages/', messageData);
      return response.data;
    }
  },

  /**
   * Update a message (sender only)
   */
  async updateMessage(messageId: string, content: string): Promise<Message> {
    const response = await messagingApi.patch<Message>(`/messages/${messageId}/`, { content });
    return response.data;
  },

  /**
   * Delete a message (sender only)
   */
  async deleteMessage(messageId: string): Promise<void> {
    await messagingApi.delete(`/messages/${messageId}/`);
  },

  /**
   * Mark a specific message as read
   */
  async markMessageAsRead(messageId: string): Promise<MarkAsReadResponse> {
    const response = await messagingApi.post<MarkAsReadResponse>(
      `/messages/${messageId}/mark_as_read/`,
    );
    return response.data;
  },

  /**
   * Mark multiple messages as read
   */
  async bulkMarkAsRead(data: BulkMarkAsReadRequest): Promise<BulkMarkAsReadResponse> {
    const response = await messagingApi.post<BulkMarkAsReadResponse>(
      '/messages/bulk_mark_as_read/',
      data,
    );
    return response.data;
  },
};

// ============================================================================
// Admin API Functions
// ============================================================================

export const adminApi = {
  /**
   * Get all threads for admin management
   */
  async getAllThreads(filters: ThreadFilters = {}): Promise<ThreadListResponse> {
    const queryParams = buildQueryParams(filters as Record<string, unknown>);
    const response = await messagingApi.get<ThreadListResponse>(`/admin/threads/${queryParams}`);
    return response.data;
  },

  /**
   * Bulk assign threads to an admin
   */
  async bulkAssignThreads(data: BulkAssignThreadsRequest): Promise<BulkAssignResponse> {
    const response = await messagingApi.post<BulkAssignResponse>(
      '/admin/threads/bulk_assign/',
      data,
    );
    return response.data;
  },

  /**
   * Bulk update thread status
   */
  async bulkUpdateThreadStatus(
    data: BulkUpdateThreadStatusRequest,
  ): Promise<BulkStatusUpdateResponse> {
    const response = await messagingApi.post<BulkStatusUpdateResponse>(
      '/admin/threads/bulk_update_status/',
      data,
    );
    return response.data;
  },

  /**
   * Get messaging statistics for admin dashboard
   */
  async getMessagingStats(): Promise<MessagingStats> {
    const response = await messagingApi.get<MessagingStats>('/admin/threads/stats/');
    return response.data;
  },
};

// ============================================================================
// WebSocket URL Builders
// ============================================================================

export const webSocketApi = {
  /**
   * Build WebSocket URL for thread-specific messaging
   */
  buildThreadWebSocketUrl(threadId: string, token: string): string {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = process.env.VITE_WS_HOST || window.location.host;
    return `${wsProtocol}//${host}/ws/messaging/thread/${threadId}/?token=${token}`;
  },

  /**
   * Build WebSocket URL for global messaging notifications
   */
  buildGlobalWebSocketUrl(token: string): string {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = process.env.VITE_WS_HOST || window.location.host;
    return `${wsProtocol}//${host}/ws/messaging/global/?token=${token}`;
  },
};

// ============================================================================
// File Upload API
// ============================================================================

export const fileUploadApi = {
  /**
   * Upload files with progress tracking
   */
  async uploadFiles(files: File[], onProgress?: (progress: number) => void): Promise<string[]> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent: { loaded: number; total?: number }) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    };

    const response = await messagingApi.post('/files/upload/', formData, config);

    return (response.data as { file_urls: string[] }).file_urls;
  },
};

// ============================================================================
// Error Handling Utilities
// ============================================================================

export const apiErrorHandler = {
  /**
   * Extract error message from API response
   */
  getErrorMessage(error: unknown): string {
    const errorWithResponse = error as {
      response?: { data?: { message?: string; detail?: string } | string };
      message?: string;
    };

    if (errorWithResponse.response?.data) {
      const data = errorWithResponse.response.data;
      if (typeof data === 'object' && data.message) {
        return data.message;
      }
      if (typeof data === 'object' && data.detail) {
        return data.detail;
      }
      if (typeof data === 'string') {
        return data;
      }
    }

    if (errorWithResponse.message) {
      return errorWithResponse.message;
    }

    return 'An unexpected error occurred';
  },

  /**
   * Check if error is due to network issues
   */
  isNetworkError(error: unknown): boolean {
    const errorObj = error as { response?: unknown; code?: string };
    return errorObj?.code === 'NETWORK_ERROR' && !errorObj?.response;
  },

  /**
   * Check if error is due to authentication issues
   */
  isAuthError(error: unknown): boolean {
    return (error as { response?: { status?: number } })?.response?.status === 401;
  },

  /**
   * Check if error is due to permission issues
   */
  isPermissionError(error: unknown): boolean {
    return (error as { response?: { status?: number } })?.response?.status === 403;
  },

  /**
   * Check if error is due to resource not found
   */
  isNotFoundError(error: unknown): boolean {
    return (error as { response?: { status?: number } })?.response?.status === 404;
  },
};

// ============================================================================
// Export All APIs
// ============================================================================

export const messagingApiClient = {
  threads: threadsApi,
  messages: messagesApi,
  admin: adminApi,
  webSocket: webSocketApi,
  fileUpload: fileUploadApi,
  errorHandler: apiErrorHandler,
};

export default messagingApiClient;
