/**
 * Default Messaging Configuration
 * 
 * Separated from React components to ensure Vite Fast Refresh compatibility.
 * This file contains only configuration objects and utility functions.
 */

import type { MessagingConfig } from '../types/messaging.types';

export const DEFAULT_MESSAGING_CONFIG: MessagingConfig = {
  userRole: 'CLIENT',
  enableRealTime: true,
  enableFileUploads: true,
  enableInternalNotes: false,
  enableBulkOperations: false,
  enableCannedResponses: false,
  enableSearch: true,
  enableVirtualScrolling: true,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedFileTypes: ['image/*', 'application/pdf', '.doc', '.docx', '.txt'],
  messagesPerPage: 50,
  threadsPerPage: 20,
  typingTimeout: 3000,
  typingDebounceMs: 1000,
  reconnectAttempts: 5,
  reconnectDelay: 1000,
  simplified: false,
  autoMarkAsRead: false,
  enableTypingIndicators: true,
  enableReadReceipts: false,
};

/**
 * Create messaging configuration for specific user roles
 */
export const createMessagingConfig = (userRole: 'CLIENT' | 'ADMIN'): Partial<MessagingConfig> => ({
  CLIENT: {
    userRole: 'CLIENT' as const,
    enableInternalNotes: false,
    enableBulkOperations: false,
    enableCannedResponses: false,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFileTypes: ['image/*', 'application/pdf', '.doc', '.docx'],
    simplified: true,
    autoMarkAsRead: true,
    enableSearch: false,
    enableVirtualScrolling: false,
    messagesPerPage: 30,
    threadsPerPage: 10,
    reconnectAttempts: 3,
    reconnectDelay: 2000,
    enableReadReceipts: false,
  },
  ADMIN: {
    userRole: 'ADMIN' as const,
    enableInternalNotes: true,
    enableBulkOperations: true,
    enableCannedResponses: true,
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedFileTypes: ['image/*', 'application/pdf', '.doc', '.docx', '.txt', '.xlsx', '.pptx'],
    simplified: false,
    autoMarkAsRead: false,
    enableSearch: true,
    enableVirtualScrolling: true,
    messagesPerPage: 50,
    threadsPerPage: 20,
    reconnectAttempts: 5,
    reconnectDelay: 1000,
    enableReadReceipts: true,
  },
})[userRole];

/**
 * Create WebSocket configuration
 */
export const createWebSocketConfig = (
  getAuthToken: () => string | null,
  environment: 'development' | 'production' = 'development'
) => {
  const wsProtocol = environment === 'production' && typeof window !== 'undefined' 
    ? (window.location.protocol === 'https:' ? 'wss:' : 'ws:')
    : 'ws:';
    
  const baseUrl = environment === 'production' && typeof window !== 'undefined'
    ? window.location.host
    : 'localhost:8000';
    
  return {
    url: `${wsProtocol}//${baseUrl}/ws/messaging/`,
    protocols: ['messaging'],
    getAuthToken,
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
    heartbeatInterval: 30000,
  };
};