// Main export file for shared messaging system
// Provides a single entry point for both applications

// Context exports
export {
  WebSocketProvider,
  useWebSocket,
  useWebSocketConnectionState,
} from './services/websocket.context';

export {
  MessagingProvider,
  useMessagingContext,
  useMessagingActions,
  useMessagingState,
  useMessagingConfig,
} from './providers/MessagingProvider';

// Hook exports
export * from './hooks/messaging';

// API exports
export { 
  messagingApi,
  setApiClient,
} from './apis/messaging.api';

// Query keys
export { messagingKeys } from './queries/messagingKeys';

// Type exports
export * from './types/messaging.types';

// Utility functions for integration
export const createMessagingConfig = (userRole: 'CLIENT' | 'ADMIN') => ({
  CLIENT: {
    userRole: 'CLIENT' as const,
    enableInternalNotes: false,
    enableBulkOperations: false,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    simplified: true,
    autoMarkAsRead: true,
    typingDebounceMs: 1000,
  },
  ADMIN: {
    userRole: 'ADMIN' as const,
    enableInternalNotes: true,
    enableBulkOperations: true,
    maxFileSize: 50 * 1024 * 1024, // 50MB
    autoMarkAsRead: false,
    typingDebounceMs: 1000,
  },
})[userRole];

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